import { Injectable } from '@nestjs/common';

@Injectable()
export class CommissionService {
  private map = new Map<number, number>();

  setCommission(vendorId: number, ratePercent: number) {
    this.map.set(vendorId, Number(ratePercent));
    return { vendorId, commission: Number(ratePercent) };
  }

  getCommission(vendorId: number) {
    return { vendorId, commission: this.map.get(vendorId) ?? null };
  }

  removeCommission(vendorId: number) {
    const existed = this.map.delete(vendorId);
    return { deleted: existed };
  }
}
