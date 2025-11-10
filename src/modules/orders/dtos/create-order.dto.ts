import {
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsString,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAddressDto } from '../../users/dtos/create-address.dto';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  direccionEntrega?: string;

  @IsOptional()
  @IsInt()
  metodoPagoId?: number;

  @IsOptional()
  @IsString()
  @IsIn(['CASH', 'CARD', 'ONLINE'], { each: false })
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsInt()
  addressId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  newAddress?: CreateAddressDto;
}
