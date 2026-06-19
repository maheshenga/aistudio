import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUsageDto {
  @IsString() @MinLength(1) category!: string;
  @IsInt() @Min(0) credits!: number;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() targetId?: string;
  @IsOptional() @IsString() providerKind?: string;
  @IsOptional() @IsString() runtimeMode?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class UsageRangeQuery {
  @IsOptional() @Type(() => Date) from?: Date;
  @IsOptional() @Type(() => Date) to?: Date;
}
