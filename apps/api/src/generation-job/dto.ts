import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
const STATUSES = ['pending', 'running', 'succeeded', 'failed', 'cancelled'] as const;
export class CreateJobDto {
  @IsOptional() @IsString() @MinLength(1) type?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() runtimeTaskId?: string;
  @IsOptional() @IsString() runtimeMode?: string;
  @IsOptional() @IsString() providerKind?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsObject() input?: Record<string, unknown>;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsString() error?: string;
  @IsOptional() @IsString() status?: string;
}
export class UpdateStatusDto {
  @IsIn(STATUSES as unknown as string[]) status!: string;
  @IsOptional() @IsString() error?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
}
export class ListJobQuery {
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() moduleId?: string;
}
