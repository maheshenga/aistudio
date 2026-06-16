import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['active', 'rate_limited', 'offline', 'needs_config'] as const;

export class CreateMediaAccountDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) platformName!: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() @Min(0) connectedAccounts?: number;
  @IsOptional() @IsString() credentialRef?: string;
  @IsOptional() @IsString() clientIdLast4?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateMediaAccountDto {
  @IsOptional() @IsString() @MinLength(1) platformName?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() @Min(0) connectedAccounts?: number;
  @IsOptional() @IsString() credentialRef?: string;
  @IsOptional() @IsString() clientIdLast4?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListMediaAccountQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
