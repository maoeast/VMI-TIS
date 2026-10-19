import { IsString } from 'class-validator';

export class ParentMessageDto {
  @IsString()
  message!: string;
}
