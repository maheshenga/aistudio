import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
const ROLES = ['owner', 'admin', 'operator', 'finance', 'viewer'] as const;
export class CreateMemberDto {
  @IsString() @MinLength(1) userId!: string;
  @IsIn(ROLES as unknown as string[]) role!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
}
export class UpdateMemberDto {
  @IsOptional() @IsIn(ROLES as unknown as string[]) role?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
}
