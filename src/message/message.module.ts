import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Bee, BeeSchema } from '../database/schemas/bee.schema';
import { Message, MessageSchema } from '../database/schemas/message.schema';

@Module({
  controllers: [MessageController],
  exports: [MessageService],
  imports: [
    MongooseModule.forFeature([
      { name: Bee.name, schema: BeeSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    RabbitMQModule,
  ],
  providers: [MessageService],
})
export class MessageModule {}
