import { Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitOptions } from './rabbitmq.config';
import { MessageConsumerService } from './consumers/message-consumer.service';
import { CacheService } from '../cache/cache.service';
import { BeeModule } from '../bee/bee.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from '../database/schemas/message.schema';

@Module({
  providers: [
    {
      provide: 'RABBIT_OPTIONS',
      useClass: RabbitOptions,
    },
    CacheService,
    RabbitMQService,
    MessageConsumerService,
  ],
  imports: [
    BeeModule,
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
  ],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
