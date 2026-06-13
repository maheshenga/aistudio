import { IsOptional, IsString, MinLength } from 'class-validator';
export class CreateWorkspaceDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() plan?: string;
  @IsOptional() @IsString() slug?: string;
}
export class UpdateWorkspaceDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() plan?: string;
}
