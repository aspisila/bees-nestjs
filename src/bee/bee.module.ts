import { Module } from '@nestjs/common';
import { BeeController } from './bee.controller';
import { BeeService } from './bee.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Bee, BeeSchema } from '../database/schemas/bee.schema';
import { CacheService } from '../cache/cache.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Bee.name, schema: BeeSchema }])],
  controllers: [BeeController],
  providers: [BeeService, CacheService],
  exports: [BeeService],
})
export class BeeModule {}
