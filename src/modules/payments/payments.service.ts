import { Injectable } from '@nestjs/common';

export type PaymentResult = {
  success: boolean;
  transactionId?: string;
  message?: string;
};

@Injectable()
export class PaymentsService {
  async processPayment(
    userId: number,
    amount: number,
    paymentMethod: string | number,
  ): Promise<PaymentResult> {
    const tx = `TX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return { success: true, transactionId: tx };
  }
}
