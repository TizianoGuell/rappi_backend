import {
  Controller,
  Post,
  UseGuards,
  Req,
  Param,
  Delete,
  Get,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('favorites')
export class FavoritesController {
  constructor(private favService: FavoritesService) {}

  @UseGuards(AuthGuard)
  @Post(':restaurantId')
  async add(@Req() req: any, @Param('restaurantId') restaurantId: string) {
    return this.favService.add(req.user.sub, Number(restaurantId));
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.favService.remove(req.user.sub, Number(id));
  }

  @UseGuards(AuthGuard)
  @Get()
  async list(@Req() req: any) {
    return this.favService.list(req.user.sub);
  }
}
