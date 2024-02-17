import { Injectable } from '@nestjs/common';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  async createMongooseOptions(): Promise<MongooseModuleOptions> {
    return {
      uri: process.env.MONGODB_URI,
      dbName: process.env.MONGODB_NAME || 'beesDev',
      autoCreate: true,
      retryDelay: 10_000,
    };
  }
}
