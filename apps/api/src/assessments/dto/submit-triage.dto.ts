import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class BehaviorItemDto {
  @IsString()
  item!: string;

  @IsNumber()
  score!: number;
}

export class SubmitTriageDto {
  @IsString()
  studentId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BehaviorItemDto)
  behaviorItems!: BehaviorItemDto[];

  /**
   * 契约字段保留以兼容前端请求；服务端会按 R1 规则重新计算，
   * 不信任客户端传入的红区结论。
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  redZoneItems?: string[];

  /**
   * 结构化红区编码（种子 RED_ZONE_TRIAGE_ITEMS.code）。
   * 服务端按种子重算；未知编码直接 400，不静默降级。
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  redZoneCodes?: string[];
}
