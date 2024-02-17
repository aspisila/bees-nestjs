import { ForbiddenException, Injectable } from '@nestjs/common';
import { SendMessageDto } from './dto/message.request.dto';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { InjectModel } from '@nestjs/mongoose';
import { Bee } from '../database/schemas/bee.schema';
import { Model } from 'mongoose';
import { Message } from '../database/schemas/message.schema';
// import { RabbitConsumer } from '../rabbitmq/rabbbit-consumer.decorator';

@Injectable()
export class MessageService {
  constructor(
    private readonly rabbitMqService: RabbitMQService,
    @InjectModel(Bee.name) private beeModel: Model<Bee>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async sendMessage(body: SendMessageDto) {
    const sender = await this.checkBee(body.sender, 'sender');
    const receive = await this.checkBee(body.receive, 'receive');
    const message = await new this.messageModel({
      sender: sender.id,
      receive: receive.id,
      content: body.content,
      status: 'pending',
      createdAt: new Date(),
    }).save();

    this.rabbitMqService.publish('bee-message', message.toJSON());

    return message;
  }

  async checkBee(beeName: string, type: string) {
    const checkBee = await this.beeModel.findOne({
      name: beeName.toLowerCase(),
    });

    if (!checkBee) {
      throw new ForbiddenException({ error: `${type}Invalid` });
    }

    return checkBee;
  }
}
