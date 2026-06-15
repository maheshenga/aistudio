import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class DispatchDto {
  @IsString() @MinLength(1) type!: string;
  @IsObject() input!: Record<string, unknown>;
  @IsString() @MinLength(1) runtimeMode!: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() providerKind?: string;
}

export class LinkExternalDto {
  @IsString() @MinLength(1) externalTaskId!: string;
  @IsOptional() @IsObject() externalRef?: Record<string, unknown>;
}
