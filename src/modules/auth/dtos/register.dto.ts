import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsPhoneNumber,
  IsInt,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    // convert numeric strings to numbers so IsInt can validate them
    if (typeof value === 'string' && /^[0-9]+$/.test(value)) return Number(value);
    return value;
  })
  @ValidateIf((o, value) => typeof value === 'string')
  @IsString()
  @ValidateIf((o, value) => typeof value === 'number')
  @IsInt()
  role?: string | number;

  @IsOptional()
  isActive?: boolean = true;
}
