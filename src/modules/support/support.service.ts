import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './ticket.entity';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(Ticket) private ticketRepo: Repository<Ticket>,
  ) {}

  async createTicket(
    userId: number | null,
    dto: { subject: string; body: string },
  ) {
    const t = this.ticketRepo.create({
      subject: dto.subject,
      body: dto.body,
      status: 'open',
      user: userId ? ({ id: userId } as any) : undefined,
    } as any);
    return this.ticketRepo.save(t as any);
  }

  async listForUser(userId: number) {
    return this.ticketRepo.find({
      where: { user: { id: userId } } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async getOne(id: number) {
    const t = await this.ticketRepo.findOne({ where: { id } as any });
    if (!t) throw new NotFoundException('Ticket not found');
    return t;
  }
}
