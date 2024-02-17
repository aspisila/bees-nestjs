import { Inject, Logger } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { Channel, Message } from 'amqplib';

export function RabbitConsumer(options?: { retry: boolean }): MethodDecorator {
  const logger = new Logger(RabbitConsumer.name);
  const Serviceinjector = Inject(RabbitMQService);

  return function decorator(
    target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): void {
    Serviceinjector(target, 'rabbit');

    const method = descriptor.value;

    descriptor.value = async function wrapper(
      originalMsg: Message,
      channel: Channel,
      queueName: string,
    ) {
      try {
        const payload = JSON.parse(originalMsg.content.toString('utf8'));
        return await Reflect.apply(method, this, [payload]);
      } catch (error) {
        const message = error.message || error;
        logger.error(message);

        if (options?.retry) {
          logger.warn(`${queueName} retrying`);
          this.rabbit.retry(originalMsg, channel, queueName);
        }
      }
    };
  };
}
