import {
  HttpException,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Channel, Message, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { AmqpConnectionManager, connect } from 'amqp-connection-manager';
import {
  RabbitChannel,
  RabbitMQChannelOptions,
  RabbitMQModuleOptions,
  RabbitOptionsFactory,
} from './rabbit-options.interface';

function throwRabbitException(
  message: ConsumeMessage,
  channel: ConfirmChannel,
  queue: string,
) {
  throw new HttpException('message', 503, {
    cause: new Error(
      `Unable to connect with RabbitMQ, error: ${message} at channel ${channel} on queue ${queue}`,
    ),
  });
}

@Injectable()
export class RabbitMQService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private rabbitTerminalErrors = [
    'channel-error',
    'precondition-failed',
    'not-allowed',
    'access-refused',
  ];
  private rabbitModuleOptions: RabbitOptionsFactory;
  private publishChannel: Map<string, RabbitChannel> = new Map();
  private readonly logger: Logger = new Logger(RabbitMQService.name);
  private readonly deadletterQueue = 'deadletter';
  private readonly deadletterExchange = 'deadletter';
  private connectConfig = false;
  private syncInterval = null;
  public connection: AmqpConnectionManager;

  private defaultConsumerOptions: RabbitMQChannelOptions = {
    queue: null,
    exchangeType: 'direct',
    prefetch: 15,
    retryMaxCount: 10,
    retryDelay: 5000,
    retryEnable: true,
    retryExchange: 'bee-retry',
    retrySuffix: '_retry',
  };

  constructor(@Inject('RABBIT_OPTIONS') options: RabbitOptionsFactory) {
    this.rabbitModuleOptions = options;
  }

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV != 'test') {
      await this.syncRabbitmqStatus();

      this.syncInterval = setInterval(
        async () => await this.syncRabbitmqStatus(),
        30 * 1000,
      );
    }
  }

  onApplicationShutdown() {
    if (process.env.NODE_ENV != 'test') {
      this?.connection?.close();
      clearInterval(this.syncInterval);
    }
  }

  /**
   * connect to rabbit brokers
   * @param options {RabbitConnectionOptions}
   * @returns
   */
  connect(options: RabbitMQModuleOptions) {
    if (this.connectConfig && !this.connection) {
      this.logger.debug('Creating RabbitMQ connection');

      this.connection = connect(options.rabbitOptions.urls, {
        heartbeatIntervalInSeconds: 60,
        reconnectTimeInSeconds: 5,
        connectionOptions: {
          keepAlive: true,
          keepAliveDelay: 5000,
        },
      });

      this.connection.on('connect', ({ url }) => {
        this.registerConnection(options);
        this.logger.log(`Rabbit connected to ${url}`);
      });

      this.connection.on('disconnect', ({ err }) => {
        this.logger.error(`Disconnected from rabbitmq: ${err.message}`);
        this.connection.close();

        if (
          !this.rabbitTerminalErrors.some((errorMessage) =>
            err.message.toLowerCase().includes(errorMessage),
          )
        )
          this.connect(this.rabbitModuleOptions.createRabbitOptions());
      });

      this.connection.on('connectFailed', ({ err }) => {
        this.logger.error(
          `Failure to connect to RabbitMQ instance: ${err.message}`,
        );
      });
    } else {
      this.logger.log(`Connection to Rabbitmq is disabled`);
    }
  }

  /**
   * Creates a publish channel to be used in hte "publish" method
   * @param exchange exchange name to create the channel
   * @param exchangeType type os the exchange "direct" "topic"
   * @returns RabbitService
   */
  async createPublishChannel(
    exchange: string,
    exchangeType?: string,
  ): Promise<RabbitMQService> {
    const wrapper = this.connection.createChannel({
      setup: (channel: ConfirmChannel) => {
        return Promise.all([
          channel.assertExchange(
            exchange,
            exchangeType || this.defaultConsumerOptions.exchangeType,
            {
              durable: true,
            },
          ),
        ]);
      },
    });

    const channel: RabbitChannel = {
      exchangeType,
      wrapper,
    };

    this.publishChannel.set(exchange, channel);

    return this;
  }

  /**
   * Consume messages sent to the given queue
   * @param queueName {string} name of default queue
   * @param callback {function}
   */
  consumeQueue(
    customConsumerOptions: RabbitMQChannelOptions,
    callback: (
      message: ConsumeMessage,
      channel: ConfirmChannel,
      queue: string,
    ) => Promise<void>,
  ): void {
    const consumerOptions = {
      ...this.defaultConsumerOptions,
      ...customConsumerOptions,
    };
    const retryableQueue = `${consumerOptions.queue}${consumerOptions.retrySuffix}`;

    // set default value to exchange and routing key
    // if no value is configured, queue name is used
    consumerOptions.exchange =
      consumerOptions.exchange || consumerOptions.queue;
    consumerOptions.routingKey =
      consumerOptions.routingKey || consumerOptions.queue;

    const connectDefaultChannel = () => {
      return this.connection.createChannel({
        setup: (channel: ConfirmChannel) => {
          return Promise.all([
            channel.prefetch(consumerOptions.prefetch),
            channel.assertQueue(consumerOptions.queue, { durable: true }),
            channel.assertExchange(
              consumerOptions.exchange,
              consumerOptions.exchangeType,
              {
                durable: true,
              },
            ),
            channel.bindQueue(
              consumerOptions.queue,
              consumerOptions.exchange,
              consumerOptions.routingKey,
            ),
            channel.consume(consumerOptions.queue, async (message) => {
              try {
                if (message !== null)
                  await callback(message, channel, consumerOptions.queue);
              } catch (error) {
                if (consumerOptions.retryEnable) {
                  this.retry(message, channel, consumerOptions.queue);
                }

                throw error;
              } finally {
                channel.ack(message);
              }
            }),
          ]);
        },
      });
    };

    const connectRetryableChannel = () => {
      return this.connection.createChannel({
        setup: (channel: ConfirmChannel) => {
          return Promise.all([
            channel.prefetch(consumerOptions.prefetch),
            channel.assertQueue(retryableQueue, { durable: true }),
            channel.assertQueue(this.deadletterQueue, { durable: true }),
            channel.assertExchange(this.deadletterExchange, 'direct', {
              durable: true,
            }),
            channel.bindQueue(
              this.deadletterQueue,
              this.deadletterExchange,
              this.deadletterQueue,
            ),
            // channel.assertExchange(
            //   consumerOptions.retryExchange,
            //   'x-delayed-message',
            //   {
            //     durable: true,
            //     arguments: { 'x-delayed-type': 'direct' },
            //   },
            // ),
            // channel.bindQueue(
            //   retryableQueue,
            //   consumerOptions.retryExchange,
            //   consumerOptions.retryRoutingKey || retryableQueue,
            // ),
            channel.consume(retryableQueue, (message: ConsumeMessage) => {
              const content = this.parse<any>(message);

              if (content !== null) {
                if (content.rmq_retry_count >= consumerOptions.retryMaxCount) {
                  this.sendToDeadLetterExchange(message, channel);
                } else {
                  callback(addRetryCount(message), channel, retryableQueue);
                }
              }
            }),
          ]);
        },
      });
    };

    const addRetryCount = (message: ConsumeMessage): ConsumeMessage => {
      const content = this.parse<any>(message);

      if (!content.rmq_retry_count) content.rmq_retry_count = 1;

      message.content = Buffer.from(
        this.unparse(
          Object.assign(content, {
            rmq_retry_count: content.rmq_retry_count + 1,
          }),
        ),
      );

      return message;
    };

    const consumeAllQueues = () => {
      connectDefaultChannel()
        .waitForConnect()
        .then(() =>
          this.logger.log(
            `Queue ${consumerOptions.queue}. Enable: ${this.connectConfig}`,
          ),
        );

      if (consumerOptions.retryEnable)
        connectRetryableChannel()
          .waitForConnect()
          .then(() =>
            this.logger.log(
              `Queue ${retryableQueue}. Enable: ${this.connectConfig}`,
            ),
          );
    };

    consumeAllQueues();
  }

  /**
   * Publish a message to the queue
   * @param queueName {string}
   * @param message {string}
   * @param options {RabbitConnectionOptions}
   */
  async publish<T>(
    queueName: string,
    message: T,
    routingKey?: string,
  ): Promise<RabbitMQService> {
    if (this.connection) {
      try {
        const channel = this.publishChannel.get(queueName);

        if (!channel) {
          throw new Error(
            `Publish channel for ${queueName} not found, did you forget to createPublishChannel ?`,
          );
        }

        await channel.wrapper.publish(
          queueName,
          routingKey || queueName,
          Buffer.from(this.unparse(message)),
        );
      } catch (error) {
        throw error;
      }

      return this;
    } else {
      if (process.env.NODE_ENV != 'test') return null;
      Logger.error('Connection with RabbitMQ is closed. Cannot publish');
      return null;
    }
  }

  /**
   * Retry sending the message
   * @param message
   * @param channel
   * @param queue
   */
  retry(message: Message, channel: Channel, queue: string): void {
    queue = queue.includes(this.defaultConsumerOptions.retrySuffix)
      ? queue
      : `${queue}${this.defaultConsumerOptions.retrySuffix}`;

    channel.publish(
      this.defaultConsumerOptions.retryExchange || queue,
      queue,
      message.content,
      {
        headers: {
          'x-delay': this.defaultConsumerOptions.retryDelay,
          ...message.properties?.headers,
        },
      },
    );
  }

  /**
   * send message to deadletter exchange
   * @param message
   * @param channel
   */
  sendToDeadLetterExchange(message: Message, channel: Channel): void {
    // aknowledge the message
    channel.ack(message);

    message.content = this.parse<any>(message);

    const dle = this.deadletterExchange;
    const dlRoutingKey = dle;
    const bufferedMessage = Buffer.from(this.unparse(message));

    channel.publish(dle, dlRoutingKey, bufferedMessage);
  }

  /**
   * Parse Rabbit massage content to JSON Object
   * @param message (Message)
   * @returns
   */
  parse<T>(message: Message): T {
    if (!message) return null;

    try {
      return JSON.parse(message.content.toString('utf8')) as T;
    } catch {
      return null;
    }
  }

  /**
   * Parse JSON like object to string
   * @param message any javascript object
   * @returns
   */
  unparse<T>(message: T): string {
    return JSON.stringify(message);
  }

  private registerConnection(options: RabbitMQModuleOptions) {
    if (options.publishChannels) {
      for (const channel of options.publishChannels) {
        this.createPublishChannel(channel.exchangeName, channel.exchangeType);
        if (channel.options)
          this.consumeQueue(
            channel.options,
            (message, cha, que) =>
              new Promise((_resolve, _reject) =>
                throwRabbitException(message, cha, que),
              ),
          );
      }
    }

    if (options.consumerChannels) {
      for (const channel of options.consumerChannels) {
        this.consumeQueue(channel.options, channel.messageHandler);
      }
    }
  }

  private async syncRabbitmqStatus(): Promise<boolean> {
    const currentConfig = this.connectConfig;
    this.connectConfig = true;

    if (this.connectConfig != currentConfig) {
      if (this.connectConfig) {
        this.logger.log('RabbitMQ connection enabled', 'RabbitMQService');
        this.connect(this.rabbitModuleOptions.createRabbitOptions());
      } else {
        this.logger.log('RabbitMQ connection disabled', 'RabbitMQService');
        this?.connection?.close();
        this.connection = null;
      }
    }

    return true;
  }
}
