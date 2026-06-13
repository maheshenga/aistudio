import { IsOptional, IsString, MinLength } from 'class-validator';
export class CreateAssetDto {
  @IsString() @MinLength(1) kind!: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}
export class ListAssetQuery {
  @IsOptional() @IsString() kind?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() jobId?: string;
}
