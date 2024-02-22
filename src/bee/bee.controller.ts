import {
  Body,
  Controller,
  Get,
  Post,
  Sse,
  MessageEvent,
  Query,
} from '@nestjs/common';
import { BeeService } from './bee.service';
import { BeeRequestDto } from './dto/bee.request.dto';
import { Observable } from 'rxjs';

@Controller('bees')
export class BeeController {
  constructor(private readonly beeService: BeeService) {}

  @Post('/')
  @Sse('/')
  async addBee(@Body() body: BeeRequestDto): Promise<Observable<MessageEvent>> {
    return this.beeService.addBee(body);
  }

  @Get('/')
  async getBees(@Query('page') page: number, @Query('limit') limit: number) {
    return this.beeService.getBees(page, limit);
  }
}
