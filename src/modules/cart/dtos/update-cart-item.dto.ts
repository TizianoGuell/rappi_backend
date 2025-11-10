import { IsInt, Min, IsOptional } from 'class-validator';

export class UpdateCartItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;
}
