import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DashboardPreviewQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expires?: number;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
