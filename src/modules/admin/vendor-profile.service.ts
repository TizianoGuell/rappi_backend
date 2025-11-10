import { Injectable } from '@nestjs/common';

@Injectable()
export class VendorProfileService {
  private map = new Map<number, any>();

  setProfile(restaurantId: number, profile: any) {
    this.map.set(restaurantId, {
      ...(this.map.get(restaurantId) ?? {}),
      ...profile,
    });
    return this.map.get(restaurantId);
  }

  getProfile(restaurantId: number) {
    return this.map.get(restaurantId) ?? null;
  }

  removeProfile(restaurantId: number) {
    const existed = this.map.delete(restaurantId);
    return { deleted: existed };
  }
}
