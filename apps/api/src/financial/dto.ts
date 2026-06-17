import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

const KINDS = ['subscription', 'invoice', 'payment', 'refund', 'withdrawal', 'credit'] as const;
const STATUSES = ['paid', 'pending', 'issued', 'refunded', 'cancelled', 'approved'] as const;

export class CreateFinancialRecordDto {
  @IsOptional() @IsString() id?: string;
  @IsIn(KINDS as unknown as string[]) kind!: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsInt() @Min(0) amountCents!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() planId?: string;
  @IsOptional() @IsString() counterparty?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateFinancialRecordDto {
  @IsOptional() @IsIn(KINDS as unknown as string[]) kind?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() @Min(0) amountCents?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() planId?: string;
  @IsOptional() @IsString() counterparty?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListFinancialRecordQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(KINDS as unknown as string[]) kind?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
