import { IsOptional, IsString } from 'class-validator';

export class ImportExcelDto {
  @IsOptional()
  @IsString()
  sheetName?: string;
}
