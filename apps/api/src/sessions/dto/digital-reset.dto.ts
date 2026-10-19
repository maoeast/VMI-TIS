import { IsString } from 'class-validator';

export class DigitalResetDto {
  @IsString()
  authorizedBy!: string;
}
