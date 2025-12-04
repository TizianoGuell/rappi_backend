import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Put,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CreatePromotionDto } from './dtos/create-promotion.dto';
import { UpdatePromotionDto } from './dtos/update-promotion.dto';
import { AssignProductsDto } from './dtos/assign-products.dto';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  async list(@Query('vendorId') vendorId?: string) {
    const filter: any = {};
    if (vendorId) filter.vendorId = Number(vendorId);
    return this.promotionsService.findAll(filter);
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.findOne(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  @Roles('admin', 'vendor')
  async create(@Req() req: any, @Body() dto: CreatePromotionDto) {
    if ((dto as any).productId)
      return this.promotionsService.createWithProduct(req.user, dto as any);
    return this.promotionsService.create(req.user, dto as any);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Put(':id')
  @Roles('admin', 'vendor')
  async update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
  ) {
    if ((dto as any).productId)
      return this.promotionsService.updateWithProduct(req.user, id, dto as any);
    return this.promotionsService.update(req.user, id, dto as any);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  @Roles('admin', 'vendor')
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.removeWithProduct(req.user, id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Post(':id/products')
  @Roles('admin', 'vendor')
  async assignProducts(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignProductsDto,
  ) {
    return this.promotionsService.assignProducts(
      req.user,
      id,
      dto.productIds || [],
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id/products/:productId')
  @Roles('admin', 'vendor')
  async removeProduct(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.promotionsService.removeProduct(req.user, id, productId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Post('maintenance/deactivate-expired')
  @Roles('admin')
  async deactivateExpired() {
    await this.promotionsService.deactivateExpired();
    return { ok: true };
  }

  @Post('validate')
  async validate(@Body() body: any) {
    const code = String(body?.code || '').trim();
    const subtotal = Number(body?.subtotal || 0);
    const items = Array.isArray(body?.items) ? body.items : [];
    const result = await this.promotionsService.validateCode(code, subtotal, items);
    return result;
  }
}
