import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';

export type IRabbitHandler = (
  message: ConsumeMessage,
  channel: ConfirmChannel,
  queue: string,
) => Promise<void>;

export type RabbitMQExchangeTypes = 'direct' | 'topic' | 'fanout' | 'headers';
export type RabbitMQChannelOptions = {
  queue: string;
  exchange?: string;
  exchangeType?: RabbitMQExchangeTypes;
  routingKey?: string;
  prefetch?: number;
  retryMaxCount?: number;
  retryEnable?: boolean;
  retrySuffix?: string;
  retryExchange?: string;
  retryDelay?: number;
  retryRoutingKey?: string;
};

export type RabbitConnectionOptions = {
  urls: string | string[];
  appName: string;
};

export type RabbitMQModuleOptions = {
  rabbitOptions: RabbitConnectionOptions;

  publishChannels?: Array<{
    exchangeName: string;
    exchangeType: RabbitMQExchangeTypes;
    options?: RabbitMQChannelOptions;
  }>;

  consumerChannels?: Array<{
    options: RabbitMQChannelOptions;
    messageHandler: IRabbitHandler;
  }>;
};

export interface RabbitOptionsFactory {
  createRabbitOptions(): RabbitMQModuleOptions;
}

export interface RabbitChannel {
  exchangeType: string;
  wrapper: ChannelWrapper;
}
