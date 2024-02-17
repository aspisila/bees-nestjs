import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  NotContains,
} from 'class-validator';

export class BeeRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @MinLength(5)
  @NotContains(' ')
  @Transform(({ value }) => value.toLocaleLowerCase())
  name: string;
}
