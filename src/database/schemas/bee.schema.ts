import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BeeDocument = HydratedDocument<Bee>;

@Schema()
export class Bee {
  @Prop({ required: true, maxLenght: 20, minlength: 5 })
  name: string;
}

export const BeeSchema = SchemaFactory.createForClass(Bee);
