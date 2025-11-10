import { IsArray, ArrayNotEmpty, ArrayUnique } from 'class-validator';

export class AssignProductsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  productIds: number[];
}
