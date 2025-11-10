export enum OrderStatus {
  CREATED = 1,
  PREPARING = 2,
  READY = 3,
  ON_THE_WAY = 4,
  DELIVERED = 5,
  CANCELLED = 6,
}

export const OrderStatusLabels: Record<number, string> = {
  [OrderStatus.CREATED]: 'CREATED',
  [OrderStatus.PREPARING]: 'PREPARING',
  [OrderStatus.READY]: 'READY',
  [OrderStatus.ON_THE_WAY]: 'ON_THE_WAY',
  [OrderStatus.DELIVERED]: 'DELIVERED',
  [OrderStatus.CANCELLED]: 'CANCELLED',
};

export function isFinalStatus(status: number) {
  return status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED;
}
