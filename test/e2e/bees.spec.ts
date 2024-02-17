import request from 'supertest';
import { TestHelper } from '../test-helper';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { getModelToken } from '@nestjs/mongoose';
import { RabbitMQService } from '../../src/rabbitmq/rabbitmq.service';
import { Model } from 'mongoose';
import { Bee, BeeDocument } from '../../src/database/schemas/bee.schema';

describe('Bees (e2e)', () => {
  let appInstance: NestFastifyApplication;
  let mockBeeModel: Model<BeeDocument>;

  jest.spyOn(RabbitMQService.prototype, 'publish').mockImplementation(() => {
    return this;
  });

  beforeAll(async () => {
    appInstance = (await TestHelper.prepare('e2e')) as NestFastifyApplication;
    mockBeeModel = appInstance.get<Model<BeeDocument>>(getModelToken(Bee.name));
  });

  afterAll(async () => {
    await appInstance.close();
  });

  describe('GET /bees ', () => {
    it('Should return an empty array', async () => {
      return request(appInstance.getHttpServer())
        .get('/bees')
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBe(0);
        });
    });

    it('Should return one bee in the list', async () => {
      const bee = new Bee();
      bee.name = 'rainha';

      const spy = jest
        .spyOn(mockBeeModel, 'find')
        .mockResolvedValue([bee as BeeDocument]);
      return request(appInstance.getHttpServer())
        .get('/bees')
        .expect(200)
        .expect((res) => {
          expect(spy).toHaveBeenCalled();
          expect(res.body.length).toBe(1);
          expect(res.body[0].name).toBe(bee.name);
        });
    });
  });
});
