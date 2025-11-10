import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { CreateReviewDto } from './dtos/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
  ) {}

  async create(userId: number, dto: CreateReviewDto) {
    const entity = this.reviewRepo.create({
      restaurantId: dto.restaurantId,
      userId,
      rating: dto.rating,
      comment: dto.comment,
    } as Partial<Review>);
    return this.reviewRepo.save(entity as any);
  }

  async listByRestaurant(restaurantId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.reviewRepo.findAndCount({
      where: { restaurantId } as any,
      order: { createdAt: 'DESC' } as any,
      take: limit,
      skip,
    } as any);
    return { items, total, page, limit };
  }

  async listAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.reviewRepo.findAndCount({
      order: { createdAt: 'DESC' } as any,
      take: limit,
      skip,
    } as any);
    return { items, total, page, limit };
  }

  async remove(id: number) {
    const r = await this.reviewRepo.findOne({ where: { id } as any });
    if (!r) return { deleted: false };
    await this.reviewRepo.remove(r);
    return { deleted: true };
  }
}
