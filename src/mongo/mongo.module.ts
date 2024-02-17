/* eslint-disable unicorn/prefer-module */
import {
  DynamicModule,
  Module,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

type MongoOptions = {
  connections?: Array<{
    configuration: any;
    connectionName?: string;
  }>;
  useMemDB?: boolean;
};
@Module({})
export class MongoModule implements OnApplicationShutdown, OnModuleInit {
  private static _mongod: MongoMemoryServer = null;

  async onApplicationShutdown() {
    if (MongoModule._mongod) {
      await MongoModule._mongod.stop();
    }
  }

  onModuleInit() {
    try {
      require('@nestjs/mongoose/package.json').version;
      require('mongoose/package.json').version;
      require('mongodb-memory-server').version;
    } catch {
      console.log(
        'The following dependencies needs to be installed to use MongoModule: @nestjs/mongoose@9.2.2, mongoose@6.10.0, mongodb-memory-server',
      );
    }
  }

  static register({
    connections,
    useMemDB = true,
  }: MongoOptions): DynamicModule {
    const mongoConns: Array<DynamicModule> = [];

    if (useMemDB && process.env.NODE_ENV == 'test') {
      mongoConns.push(this.createMemDb());
    } else {
      for (const conn of connections) {
        mongoConns.push(
          MongooseModule.forRootAsync({
            useClass: conn.configuration,
            connectionName: conn.connectionName,
          }),
        );
      }
    }

    return {
      module: MongoModule,
      imports: [...mongoConns],
    };
  }

  private static createMemDb(): DynamicModule {
    return MongooseModule.forRootAsync({
      useFactory: async () => {
        const mongod = await MongoMemoryServer.create();
        MongoModule._mongod = mongod;

        return {
          uri: mongod.getUri(),
          dbName: 'beesTest',
          autoCreate: true,
        };
      },
    });
  }
}
