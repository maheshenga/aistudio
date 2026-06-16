import { Type } from 'class-transformer';
import { IsArray, IsIn, IsObject, IsOptional, IsString, Max, Min, MinLength, IsInt } from 'class-validator';

const CHANNELS = ['viral_qr', 'nfc_touchpoint', 'website', 'store_event', 'other'] as const;
const STATUSES = ['draft', 'active', 'paused', 'archived'] as const;

export class CreateCampaignDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() userId?: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsIn(CHANNELS as unknown as string[]) channel?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsString() landingUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) linkedAssetIds?: string[];
  @IsOptional() @IsObject() metrics?: Record<string, unknown>;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsIn(CHANNELS as unknown as string[]) channel?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsString() landingUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) linkedAssetIds?: string[];
  @IsOptional() @IsObject() metrics?: Record<string, unknown>;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListCampaignQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
