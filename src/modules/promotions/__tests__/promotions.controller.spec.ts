import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsController } from '../promotions.controller';
import { PromotionsService } from '../promotions.service';

describe('PromotionsController', () => {
  let controller: PromotionsController;
  const promosMock = {
    deactivateExpired: jest.fn().mockResolvedValue(undefined),
  } as Partial<PromotionsService>;

  beforeEach(async () => {
    controller = new PromotionsController(promosMock as PromotionsService);
  });

  it('deactivateExpired delegates to service', async () => {
    const res = await controller.deactivateExpired();
    expect(promosMock.deactivateExpired).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });
});
