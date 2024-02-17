import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageResponseDto {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @MinLength(5)
  sender: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @MinLength(5)
  receive: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(140)
  content: string;
}
