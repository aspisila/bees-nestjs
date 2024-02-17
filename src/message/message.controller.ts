import { Body, Controller, Post } from '@nestjs/common';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/message.request.dto';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('/')
  async sendMessge(@Body() body: SendMessageDto) {
    return this.messageService.sendMessage(body);
  }
}
