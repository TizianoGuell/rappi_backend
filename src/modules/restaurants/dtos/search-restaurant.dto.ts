import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsIn,
  IsNumber,
} from 'class-validator';

export class SearchRestaurantDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  cuisine?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minRating?: number;

  @IsOptional()
  @IsString()
  @IsIn(['name', 'rating', 'createdAt'])
  sort?: string;
}
