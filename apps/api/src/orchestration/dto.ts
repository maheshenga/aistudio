import { IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class DispatchDto {
  @IsString() @MinLength(1) type!: string;
  @IsObject() input!: Record<string, unknown>;
  @IsString() @MinLength(1) runtimeMode!: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() providerKind?: string;
  @IsOptional() @IsInt() @Min(1) @Max(1000) unitCount?: number;
}

export class LinkExternalDto {
  @IsString() @MinLength(1) externalTaskId!: string;
  @IsOptional() @IsObject() externalRef?: Record<string, unknown>;
}
