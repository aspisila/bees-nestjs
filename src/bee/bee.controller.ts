import { Body, Controller, Get, Post, Sse, MessageEvent } from '@nestjs/common';
import { BeeService } from './bee.service';
import { BeeRequestDto } from './dto/bee.request.dto';
import { Observable } from 'rxjs';

@Controller('bees')
export class BeeController {
  constructor(private readonly beeService: BeeService) {}

  @Post('/')
  @Sse('/')
  async addBee(@Body() body: BeeRequestDto): Promise<Observable<MessageEvent>> {
    return await this.beeService.addBee(body);
  }

  @Get('/')
  async getBees() {
    return this.beeService.getBees();
  }
}
