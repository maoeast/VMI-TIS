import { IsString, MinLength } from 'class-validator';

export class DigitalResetDto {
  /** 教师授权码；服务端与 DIGITAL_RESET_CODE 比对，不信任客户端自填身份。 */
  @IsString()
  @MinLength(4)
  authorizationCode!: string;
}
