import { IsInt, IsObject, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class GrantCreditDto {
  @IsInt() @IsPositive() amount!: number;
  @IsString() @MinLength(1) reason!: string;
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @IsString() refId?: string;
  @IsOptional() @IsString() idempotencyKey?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class LedgerRangeQuery {
  @IsOptional() @Type(() => Date) from?: Date;
  @IsOptional() @Type(() => Date) to?: Date;
}
