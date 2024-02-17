import { AppModule } from '../src/app.module';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';

export class TestHelper {
  static uuidRegex = new RegExp(
    /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
  );

  static async prepare(type: 'service' | 'e2e') {
    if (type == 'e2e') {
      return this.prepareE2E();
    } else {
      return this.prepareService();
    }
  }

  private static async prepareE2E(): Promise<NestFastifyApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const appInstance =
      moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

    appInstance.useGlobalPipes(new ValidationPipe());
    await appInstance.init();
    await appInstance.getHttpAdapter().getInstance().ready();

    return appInstance;
  }

  private static async prepareService(): Promise<TestingModule> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await moduleFixture.init();
    return moduleFixture;
  }
}
