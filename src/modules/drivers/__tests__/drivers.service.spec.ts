import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriversService } from '../drivers.service';
import { Driver } from '../driver.entity';
import { Pedido } from '../../orders/order.entity';

describe('DriversService', () => {
  let service: DriversService;
  let driverRepo: Repository<Driver>;
  let ordersRepo: Repository<Pedido>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: getRepositoryToken(Driver), useClass: Repository },
        { provide: getRepositoryToken(Pedido), useClass: Repository },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
    driverRepo = module.get(getRepositoryToken(Driver));
    ordersRepo = module.get(getRepositoryToken(Pedido));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createOrGetByUser should create a driver if not found', async () => {
    const spyFind = jest
      .spyOn(driverRepo, 'findOne')
      .mockResolvedValueOnce(null as any);
    const created = { id: 5, userId: 11, available: false } as Driver;
    jest.spyOn(driverRepo, 'create').mockReturnValue(created as any);
    const spySave = jest
      .spyOn(driverRepo, 'save')
      .mockResolvedValueOnce(created as any);

    const res = await service.createOrGetByUser(11);
    expect(spyFind).toHaveBeenCalled();
    expect(spySave).toHaveBeenCalled();
    expect(res).toMatchObject({ id: 5, userId: 11 });
  });

  it('toggleAvailability should flip and persist availability', async () => {
    const drv = { id: 7, userId: 22, available: false } as Driver;
    jest
      .spyOn(service as any, 'createOrGetByUser')
      .mockResolvedValueOnce(drv as any);
    const spySave = jest
      .spyOn(driverRepo, 'save')
      .mockImplementation(async (d: any) => d);

    const out = await service.toggleAvailability(22, true);
    expect(spySave).toHaveBeenCalled();
    expect(out.available).toBe(true);
  });

  it('acceptOrder should assign driver to order and set estadoId', async () => {
    const drv = { id: 13, userId: 50 } as Driver;
    jest
      .spyOn(service as any, 'createOrGetByUser')
      .mockResolvedValueOnce(drv as any);

    const order = {
      id: 99,
      driverId: null,
      estadoId: 1,
      total: 200,
    } as unknown as Pedido;
    const spyFindOrder = jest
      .spyOn(ordersRepo, 'findOne')
      .mockResolvedValueOnce(order as any);
    const spySaveOrder = jest
      .spyOn(ordersRepo, 'save')
      .mockImplementation(async (o: any) => o);

    const res = await service.acceptOrder(50, 99);
    expect(spyFindOrder).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 99 } }),
    );
    expect(spySaveOrder).toHaveBeenCalled();
    expect(res.driverId).toBe(13);
    expect(res.estadoId).toBe(4);
  });
});
