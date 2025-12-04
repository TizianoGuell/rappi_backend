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

export function getOrderStatusMessage(status: number) {
  switch (status) {
    case OrderStatus.CREATED:
      return 'Tu pedido ha sido recibido.';
    case OrderStatus.PREPARING:
      return 'Tu pedido está en preparación.';
    case OrderStatus.READY:
      return 'Tu pedido está listo.';
    case OrderStatus.ON_THE_WAY:
      return 'Tu pedido está en camino.';
    case OrderStatus.DELIVERED:
      return 'Tu pedido fue entregado.';
    case OrderStatus.CANCELLED:
      return 'Tu pedido fue cancelado.';
    default:
      return 'El estado de tu pedido ha cambiado.';
  }
}
