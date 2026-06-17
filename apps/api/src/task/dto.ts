import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const COLUMNS = ['todo', 'in_progress', 'auto_exec', 'review', 'done'] as const;
const PRIORITIES = ['High', 'Medium', 'Low'] as const;

export class CreateTaskDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) title!: string;
  @IsIn(COLUMNS as unknown as string[]) column!: string;
  @IsIn(PRIORITIES as unknown as string[]) priority!: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsBoolean() isAuto?: boolean;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() runtimeMode?: string;
  @IsOptional() @IsString() runtimeProviderKind?: string;
  @IsOptional() @IsString() runtimeTaskId?: string;
  @IsOptional() @IsString() runtimeStatus?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() runtimeId?: string;
  @IsOptional() @IsString() externalRef?: string;
  @IsOptional() @IsDateString() lastRuntimeEventAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsIn(COLUMNS as unknown as string[]) column?: string;
  @IsOptional() @IsIn(PRIORITIES as unknown as string[]) priority?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsBoolean() isAuto?: boolean;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() runtimeMode?: string;
  @IsOptional() @IsString() runtimeProviderKind?: string;
  @IsOptional() @IsString() runtimeTaskId?: string;
  @IsOptional() @IsString() runtimeStatus?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() runtimeId?: string;
  @IsOptional() @IsString() externalRef?: string;
  @IsOptional() @IsDateString() lastRuntimeEventAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListTaskQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(COLUMNS as unknown as string[]) column?: string;
}
