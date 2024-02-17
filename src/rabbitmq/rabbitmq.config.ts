import { MessageConsumerService } from './consumers/message-consumer.service';
import {
  RabbitMQChannelOptions,
  RabbitMQModuleOptions,
  RabbitOptionsFactory,
} from './rabbit-options.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RabbitOptions implements RabbitOptionsFactory {
  constructor(
    private readonly messageConsumerService: MessageConsumerService,
  ) {}

  createRabbitOptions(): RabbitMQModuleOptions {
    return {
      rabbitOptions: {
        appName: process.env.npm_package_name,
        urls: process.env.RABBITMQ_URL,
      },
      publishChannels: [
        { exchangeName: 'bee-message', exchangeType: 'direct' },
      ],
      consumerChannels: [
        {
          options: {
            queue: 'bee-message',
            exchangeType: 'direct',
          } as RabbitMQChannelOptions,
          messageHandler: this.messageConsumerService.processMessage.bind(
            this.messageConsumerService,
          ),
        },
      ],
    };
  }
}
