import { IsEnum, IsISO8601, IsOptional, IsString } from "class-validator";


export enum ApiKeyScope {
  FULL = "full",
  READ = "read",
}

export class CreateApiKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ApiKeyScope)
  scope?: ApiKeyScope;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}