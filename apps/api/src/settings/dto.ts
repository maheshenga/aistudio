import { IsObject, IsOptional, IsString } from 'class-validator';

export class OwnerQuery {
  @IsOptional() @IsString() ownerId?: string;
}

export class PutSettingsDto {
  @IsObject() patch!: Record<string, unknown>;
}
