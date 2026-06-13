import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateUsageDto {
  @IsString() @MinLength(1) category!: string;
  @IsInt() @Min(0) credits!: number;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}
export class UsageRangeQuery {
  @IsOptional() @Type(() => Date) from?: Date;
  @IsOptional() @Type(() => Date) to?: Date;
}
