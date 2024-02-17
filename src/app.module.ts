import { Module } from '@nestjs/common';
import { BeeModule } from './bee/bee.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { config } from 'dotenv';
import { MessageModule } from './message/message.module';
import { MongoModule } from './mongo/mongo.module';
import { MongooseConfigService } from './mongo/mongoose.config.service';

@Module({
  imports: [
    BeeModule,
    MessageModule,
    MongoModule.register({
      connections: [{ configuration: MongooseConfigService }],
    }),
    RabbitMQModule,
  ],
})
export class AppModule {
  constructor() {
    config();
  }
}
