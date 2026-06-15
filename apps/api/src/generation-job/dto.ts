import { IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
const STATUSES = ['pending', 'running', 'succeeded', 'failed', 'cancelled'] as const;
export class CreateJobDto {
  @IsString() @MinLength(1) type!: string;
  @IsOptional() @IsString() projectId?: string;
  @IsObject() input!: Record<string, unknown>;
}
export class UpdateStatusDto {
  @IsIn(STATUSES as unknown as string[]) status!: string;
  @IsOptional() @IsString() error?: string;
}
export class ListJobQuery {
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() projectId?: string;
}
