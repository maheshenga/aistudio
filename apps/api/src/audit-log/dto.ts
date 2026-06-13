import { IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateAuditDto {
  @IsString() @MinLength(1) action!: string;
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() targetId?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() actorName?: string;
  @IsOptional() @IsString() actorRole?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}
export class AuditQuery {
  @IsOptional() @IsString() action?: string;
  @IsOptional() @Type(() => Date) from?: Date;
  @IsOptional() @Type(() => Date) to?: Date;
}
