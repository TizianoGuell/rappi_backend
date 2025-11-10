export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  ONLINE = 'ONLINE',
}

export const PaymentMethodMap: Record<string, number> = {
  [PaymentMethod.CASH]: 1,
  [PaymentMethod.CARD]: 2,
  [PaymentMethod.ONLINE]: 3,
};

export function mapPaymentMethodToId(method?: string): number | undefined {
  if (!method) return undefined;
  const up = method.toUpperCase();
  return PaymentMethodMap[up] ?? undefined;
}

export function getAvailablePaymentMethods() {
  return Object.keys(PaymentMethodMap).map((k) => ({
    key: k,
    id: PaymentMethodMap[k],
  }));
}
