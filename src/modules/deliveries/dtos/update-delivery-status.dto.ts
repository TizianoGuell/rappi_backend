import { IsInt } from 'class-validator';

export class UpdateDeliveryStatusDto {
  @IsInt()
  estadoId: number;
}
