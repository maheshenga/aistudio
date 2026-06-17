import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['active', 'expired', 'disabled', 'needs_action'] as const;

export class CreatePaymentMethodDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) label!: string;
  @IsString() @MinLength(1) provider!: string;
  @IsString() @MinLength(1) brand!: string;
  @IsOptional() @IsString() last4?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsString() credentialRef?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdatePaymentMethodDto {
  @IsOptional() @IsString() @MinLength(1) label?: string;
  @IsOptional() @IsString() @MinLength(1) provider?: string;
  @IsOptional() @IsString() @MinLength(1) brand?: string;
  @IsOptional() @IsString() last4?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsString() credentialRef?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListPaymentMethodQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
