import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['active', 'paused', 'archived'] as const;

export class CreateKeywordLibraryDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() sourceText?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) keywords?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) blockedTerms?: string[];
  @IsOptional() @IsDateString() archivedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateKeywordLibraryDto {
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() sourceText?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) keywords?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) blockedTerms?: string[];
  @IsOptional() @IsDateString() archivedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListKeywordLibraryQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
