import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STAGES = ['new_lead', 'qualified', 'contacted', 'converted', 'inactive'] as const;

export class CreateCustomerDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsIn(STAGES as unknown as string[]) lifecycleStage?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsObject() source?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsIn(STAGES as unknown as string[]) lifecycleStage?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsObject() source?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListCustomerQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STAGES as unknown as string[]) lifecycleStage?: string;
  @IsOptional() @IsString() channel?: string;
}
