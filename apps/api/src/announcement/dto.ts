import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength, IsDateString } from 'class-validator';

const STATUSES = ['draft', 'active', 'scheduled', 'archived'] as const;

export class CreateAnnouncementDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) title!: string;
  @IsString() @MinLength(1) channel!: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateAnnouncementDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() @MinLength(1) channel?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListAnnouncementQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
