import { IsInt, Min } from 'class-validator';

export class AddCartItemDto {
  @IsInt()
  productoId: number;

  @IsInt()
  @Min(1)
  cantidad: number;
}
