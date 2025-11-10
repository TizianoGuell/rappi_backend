import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateReviewDto } from './dtos/create-review.dto';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(AuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateReviewDto) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.reviewsService.create(Number(userId), dto);
  }

  @Get('restaurant/:id')
  async listByRestaurant(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;
    return this.reviewsService.listByRestaurant(id, p, l);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async listAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 50;
    return this.reviewsService.listAll(p, l);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async deleteReview(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.remove(id);
  }
}
