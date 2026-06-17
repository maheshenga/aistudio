import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export class CreateTicketDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) requesterName!: string;
  @IsOptional() @IsString() requesterEmail?: string;
  @IsString() @MinLength(1) category!: string;
  @IsString() @MinLength(1) subject!: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsIn(PRIORITIES as unknown as string[]) priority?: string;
  @IsOptional() @IsDateString() resolvedAt?: string;
  @IsOptional() @IsInt() @Min(0) firstResponseMinutes?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateTicketDto {
  @IsOptional() @IsString() @MinLength(1) requesterName?: string;
  @IsOptional() @IsString() requesterEmail?: string;
  @IsOptional() @IsString() @MinLength(1) category?: string;
  @IsOptional() @IsString() @MinLength(1) subject?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsIn(PRIORITIES as unknown as string[]) priority?: string;
  @IsOptional() @IsDateString() resolvedAt?: string;
  @IsOptional() @IsInt() @Min(0) firstResponseMinutes?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListTicketQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
