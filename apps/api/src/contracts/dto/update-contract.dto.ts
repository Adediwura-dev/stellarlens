import { IsNotEmpty, IsOptional, IsString, ValidateIf } from "class-validator";

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  network?: string;
}
