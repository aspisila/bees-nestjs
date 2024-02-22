import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Message as MessageQueue } from 'amqplib';
import { Model, ObjectId } from 'mongoose';
import { BeeService } from '../../bee/bee.service';
import { ISessionCache } from '../../cache/dto/cache.dto';
import { MessageStatus } from '../../database/schemas/dto/message.dto';
import { Message } from '../../database/schemas/message.schema';

@Injectable()
export class MessageConsumerService {
  constructor(
    private readonly beeService: BeeService,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  /**
   * Consume a message from rabbitMq
   * Send the message to "recieve" bee as a new message
   * Update the message status to "sender"
   * @param originalMsg message payload from rabbitMq
   */
  async processMessage(originalMsg: MessageQueue): Promise<void> {
    const content: Message = JSON.parse(originalMsg.content.toString('utf8'));
    const message = await this.messageModel
      .findById(content._id)
      .populate(['sender', 'receive']);
    const senderSession = this.beeService.getBeeSession(message.sender.name);
    const receiveSession = this.beeService.getBeeSession(message.receive.name);

    await this.updateMessageStatus(message, 'sent');

    this.notifyNewMessage(receiveSession, content);
    this.notifyNewStatus(senderSession, content._id);
  }

  /**
   * Updated the MongoDb message document status
   * @param message mongoDb message document
   * @param status new status to update document
   */
  private async updateMessageStatus(message: Message, status: MessageStatus) {
    await this.messageModel.updateOne(message, { status });
  }

  /**
   * Notify the "receive" bee about the new message
   * @param session Receive Bee chache session to notify via SSE
   * @param content the mongoDb message document
   */
  private notifyNewMessage(session: ISessionCache, content: Message): void {
    if (session && !session.subject.closed) {
      const payload: MessageEvent = {
        type: 'message.new',
        data: {
          id: content._id,
          sender: content.sender,
          receive: content.receive,
          content: content.content,
          status: 'sent',
          createdAt: content.createdAt,
        },
      };

      session.subject.next(payload);
    } else {
      Logger.warn('receiver session not found');
    }
  }

  /**
   * Notify the sender bee about update on message satus
   * @param session Sender Bee chache session to notify via SSE
   * @param messageId MongoDb Object Id of originao message
   */
  private notifyNewStatus(session: ISessionCache, messageId: ObjectId): void {
    if (session && !session.subject.closed) {
      session.subject.next({
        type: 'message.update_status',
        data: {
          id: messageId,
          status: 'sent',
        },
      });
    } else {
      Logger.warn('sender session not found');
    }
  }
}
