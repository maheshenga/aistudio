import { IsArray, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAssetDto {
  @IsString() @MinLength(1) kind!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() previewUrl?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateAssetDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() previewUrl?: string;
  @IsOptional() @IsDateString() lastAccessedAt?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class ListAssetQuery {
  @IsOptional() @IsString() kind?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() jobId?: string;
}
