import { IsInt } from 'class-validator';

export class AcceptDeliveryDto {
  @IsInt()
  orderId: number;
}
