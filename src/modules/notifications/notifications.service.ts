import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { User } from '../users/user.entity';
import { CreateNotificationDto } from './dtos/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async createForUser(userId: number, dto: CreateNotificationDto) {
    const user = await this.userRepo.findOneBy({ id: userId } as any);
    if (!user) throw new NotFoundException('User not found');
    const notif = this.notifRepo.create({
      user,
      title: dto.title,
      body: dto.body,
      type: dto.type,
      data: dto.data && typeof dto.data !== 'string' ? JSON.stringify(dto.data) : dto.data,
    } as any);
    return this.notifRepo.save(notif);
  }

  async listForUser(userId: number) {
    return this.notifRepo.find({
      where: { user: { id: userId } as any },
      order: { createdAt: 'DESC' },
    });
  }

  async countUnreadForUser(userId: number) {
    const qb = this.notifRepo.createQueryBuilder('n');
    const count = await qb
      .where('n.userId = :userId', { userId })
      .andWhere('n.read = 0')
      .getCount();
    return count;
  }

  async markAsRead(userId: number, id: number) {
    const notif = await this.notifRepo.findOne({
      where: { id, user: { id: userId } as any },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    notif.read = true;
    return this.notifRepo.save(notif);
  }

  async remove(userId: number, id: number) {
    const notif = await this.notifRepo.findOne({
      where: { id, user: { id: userId } as any },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    await this.notifRepo.remove(notif);
    return { deleted: true };
  }
}
