import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['active', 'disabled', 'failing'] as const;

export class CreateWebhookDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) url!: string;
  @IsString() @MinLength(1) signingSecret!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) events?: string[];
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() signingSecretLast4?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateWebhookDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() @MinLength(1) url?: string;
  @IsOptional() @IsString() signingSecret?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) events?: string[];
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() @Min(0) failureCount?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListWebhookQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}

export class ListWebhookDeliveryQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
