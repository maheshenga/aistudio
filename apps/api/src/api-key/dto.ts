import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['active', 'rotating', 'revoked', 'expired'] as const;

export class CreateApiKeyDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) secret!: string;
  @IsOptional() @IsString() prefix?: string;
  @IsOptional() @IsString() last4?: string;
  @IsOptional() @IsString() keyPreview?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() expiresAt?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateApiKeyDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() secret?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() expiresAt?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListApiKeyQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
