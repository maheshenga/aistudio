import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const DECISIONS = ['blocked', 'pending_review', 'allowed', 'rate_limited', 'account_frozen'] as const;
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export class CreateRiskEventDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) action!: string;
  @IsString() @MinLength(1) contentSummary!: string;
  @IsString() @MinLength(1) rule!: string;
  @IsIn(DECISIONS as unknown as string[]) decision!: string;
  @IsIn(SEVERITIES as unknown as string[]) severity!: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsDateString() reviewedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateRiskEventDto {
  @IsOptional() @IsString() @MinLength(1) action?: string;
  @IsOptional() @IsString() @MinLength(1) contentSummary?: string;
  @IsOptional() @IsString() @MinLength(1) rule?: string;
  @IsOptional() @IsIn(DECISIONS as unknown as string[]) decision?: string;
  @IsOptional() @IsIn(SEVERITIES as unknown as string[]) severity?: string;
  @IsOptional() @IsDateString() reviewedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListRiskEventQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(DECISIONS as unknown as string[]) decision?: string;
  @IsOptional() @IsIn(SEVERITIES as unknown as string[]) severity?: string;
}
