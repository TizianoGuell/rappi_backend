import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AuthGuard } from '../auth/auth.guard';
import { AddCartItemDto } from './dtos/add-cart-item.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';

@UseGuards(AuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id;
    return await this.cartService.getCartByUser(Number(userId));
  }

  @Post('items')
  async addItem(@Req() req: any, @Body() dto: AddCartItemDto) {
    const userId = req.user?.sub ?? req.user?.id;
    await this.cartService.addItem(Number(userId), dto);
    return this.cartService.getSummary(Number(userId));
  }

  @Put('items/:id')
  async updateItem(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    await this.cartService.updateItem(Number(userId), Number(id), dto);
    return this.cartService.getSummary(Number(userId));
  }

  @Delete('items/:id')
  async removeItem(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub ?? req.user?.id;
    await this.cartService.removeItem(Number(userId), Number(id));
    return this.cartService.getSummary(Number(userId));
  }

  @Delete()
  async clear(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id;
    await this.cartService.clearCart(Number(userId));
    return this.cartService.getSummary(Number(userId));
  }
}
