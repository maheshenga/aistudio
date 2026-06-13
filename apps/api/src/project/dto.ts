import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
const STATUSES = ['active', 'draft', 'archived'] as const;
export class CreateProjectDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) linkedAssetIds?: string[];
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsOptional() @IsBoolean() favorite?: boolean;
  @IsOptional() metadata?: Record<string, unknown>;
}
export class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) linkedAssetIds?: string[];
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsOptional() @IsBoolean() favorite?: boolean;
  @IsOptional() metadata?: Record<string, unknown>;
}
export class ListProjectQuery {
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
