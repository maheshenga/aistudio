import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const PAYOUT = ['none', 'pending', 'paid', 'blocked'] as const;
const STATUSES = ['active', 'suspended'] as const;

export class CreateAgencyPartnerDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) level!: string;
  @IsOptional() @IsInt() @Min(0) invitedUsers?: number;
  @IsOptional() @IsInt() @Min(0) totalCommissionCents?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) commissionRate?: number;
  @IsOptional() @IsIn(PAYOUT as unknown as string[]) payoutStatus?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateAgencyPartnerDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() @MinLength(1) level?: string;
  @IsOptional() @IsInt() @Min(0) invitedUsers?: number;
  @IsOptional() @IsInt() @Min(0) totalCommissionCents?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) commissionRate?: number;
  @IsOptional() @IsIn(PAYOUT as unknown as string[]) payoutStatus?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListAgencyPartnerQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(PAYOUT as unknown as string[]) payoutStatus?: string;
}
