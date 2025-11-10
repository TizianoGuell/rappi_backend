import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { User } from '../users/user.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const notifRepoMock: any = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const userRepoMock: any = {
    findOneBy: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: notifRepoMock },
        { provide: getRepositoryToken(User), useValue: userRepoMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('createForUser saves notification', async () => {
    userRepoMock.findOneBy.mockResolvedValue({ id: 1 });
    notifRepoMock.create.mockReturnValue({ title: 'Hi' });
    notifRepoMock.save.mockResolvedValue({ id: 5, title: 'Hi' });

    const res = await service.createForUser(1, { title: 'Hi' } as any);
    expect(notifRepoMock.create).toHaveBeenCalled();
    expect(notifRepoMock.save).toHaveBeenCalled();
    expect(res).toMatchObject({ id: 5 });
  });

  it('listForUser calls find with user filter', async () => {
    notifRepoMock.find.mockResolvedValue([{ id: 1 }]);
    const res = await service.listForUser(1);
    expect(notifRepoMock.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
        order: { createdAt: 'DESC' },
      }),
    );
    expect(res).toHaveLength(1);
  });

  it('markAsRead updates and saves', async () => {
    notifRepoMock.findOne.mockResolvedValue({ id: 2, read: false });
    notifRepoMock.save.mockResolvedValue({ id: 2, read: true });
    const res = await service.markAsRead(1, 2);
    expect(notifRepoMock.findOne).toHaveBeenCalled();
    expect(notifRepoMock.save).toHaveBeenCalled();
    expect(res.read).toBe(true);
  });

  it('remove deletes notification', async () => {
    notifRepoMock.findOne.mockResolvedValue({ id: 3 });
    notifRepoMock.remove.mockResolvedValue(undefined);
    const res = await service.remove(1, 3);
    expect(notifRepoMock.remove).toHaveBeenCalled();
    expect(res).toEqual({ deleted: true });
  });
});
