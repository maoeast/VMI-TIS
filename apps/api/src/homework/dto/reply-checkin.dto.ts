import { IsString } from 'class-validator';

export class ReplyCheckinDto {
  @IsString()
  teacherReply!: string;
}
