import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  // AUTH-06: ≥10 chars with at least one letter and one digit.
  @IsString()
  @MinLength(10)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'password must contain at least one letter and one number' })
  password!: string;
  @IsString() @MinLength(1) name!: string;
}
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
  @IsOptional() @IsString() client?: string;
}
export class RefreshDto {
  @IsString() @MinLength(1) refreshToken!: string;
}
export class LogoutDto {
  @IsString() @MinLength(1) refreshToken!: string;
}
