import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['pending', 'completed', 'urgent'] as const;
const TYPES = ['tax_deadline', 'audit_window', 'invoice_due'] as const;

export class CreateTaxEventDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) date!: string;
  @IsString() @MinLength(1) title!: string;
  @IsIn(TYPES as unknown as string[]) type!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() amount?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateTaxEventDto {
  @IsOptional() @IsString() @MinLength(1) date?: string;
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsIn(TYPES as unknown as string[]) type?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() amount?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListTaxEventQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
