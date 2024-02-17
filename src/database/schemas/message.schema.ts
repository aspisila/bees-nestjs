import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, ObjectId } from 'mongoose';
import { Bee } from './bee.schema';
import { Transform, Type } from 'class-transformer';
import { MessageStatus } from './dto/message.dto';

export type MessageDocument = HydratedDocument<Message>;

@Schema()
export class Message {
  @Transform(({ value }) => value.toString())
  _id: ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Bee.name })
  @Type(() => Bee)
  sender: Bee;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Bee.name })
  @Type(() => Bee)
  receive: Bee;

  @Prop({ required: true, maxLenght: 140, minlength: 1 })
  content: string;

  @Prop({ required: true })
  status: MessageStatus;

  @Prop({ required: true })
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
