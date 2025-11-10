import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  Optional,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { SearchRestaurantDto } from './dtos/search-restaurant.dto';
import { Query } from '@nestjs/common';
import { CreateRestaurantDto } from './dtos/create-restaurant.dto';
import { UpdateRestaurantDto } from './dtos/update-restaurant.dto';
import { CreateMenuDto } from './dtos/create-menu.dto';
import { UpdateMenuDto } from './dtos/update-menu.dto';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { MenuImagesService } from './menu-images.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ensureDirSync } from 'fs-extra';
import { extname } from 'path';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    @Optional() private readonly menuImagesService?: MenuImagesService,
    @Optional() private readonly categoriesService?: CategoriesService,
  ) {}

  @UseGuards(AuthGuard)
  @Put('menus/:menuId/image')
  async setMenuImage(
    @Req() req: any,
    @Param('menuId', ParseIntPipe) menuId: number,
    @Body() body: { imageUrl: string },
  ) {
    const requesterId = req.user?.sub ?? req.user?.id;

    const menu = await this.restaurantsService
      .updateMenu(menuId, {}, requesterId)
      .catch(() => null);

    if (!this.menuImagesService)
      throw new BadRequestException('image service not available');

    return this.menuImagesService.createImage(menuId, body.imageUrl, false);
  }

  @UseGuards(AuthGuard)
  @Post('menus/:menuId/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = './uploads/menus';
          try {
            ensureDirSync(dest);
          } catch {
            /* ignored */
          }
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const name = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${extname(file.originalname)}`;
          cb(null, name);
        },
      }),
    }),
  )
  @UseGuards(AuthGuard)
  async uploadMenuImage(
    @Req() req: any,
    @Param('menuId', ParseIntPipe) menuId: number,
    @UploadedFile() file: any,
  ) {
    if (!this.menuImagesService)
      throw new BadRequestException('image service not available');
    const requesterId = req.user?.sub ?? req.user?.id;

    const menu = await this.restaurantsService
      .updateMenu(menuId, {}, requesterId)
      .catch(() => null);
    if (!file || !file.filename)
      throw new BadRequestException('file is required');
    const url = `/uploads/menus/${file.filename}`;
    return this.menuImagesService.createImage(menuId, url, false);
  }

  @Get('menus/:menuId/images')
  async listMenuImages(@Param('menuId', ParseIntPipe) menuId: number) {
    if (!this.menuImagesService) return [];
    return this.menuImagesService.listImages(menuId);
  }

  @UseGuards(AuthGuard)
  @Delete('menus/:menuId/images/:imageId')
  async deleteMenuImage(
    @Req() req: any,
    @Param('menuId', ParseIntPipe) menuId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    const requesterId = req.user?.sub ?? req.user?.id;
    const menu = await this.restaurantsService
      .updateMenu(menuId, {}, requesterId)
      .catch(() => null);

    if (!this.menuImagesService)
      throw new BadRequestException('image service not available');
    return this.menuImagesService.removeImageById(imageId);
  }

  @UseGuards(AuthGuard)
  @Put('menus/:menuId/images/:imageId/primary')
  async markPrimary(
    @Req() req: any,
    @Param('menuId', ParseIntPipe) menuId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    const requesterId = req.user?.sub ?? req.user?.id;
    const menu = await this.restaurantsService
      .updateMenu(menuId, {}, requesterId)
      .catch(() => null);
    if (!menu) return { error: 'menu not found or not authorized' };
    if (!this.menuImagesService)
      throw new BadRequestException('image service not available');
    return this.menuImagesService.markPrimary(menuId, imageId);
  }

  @Get()
  async getAll(@Query() query: SearchRestaurantDto) {
    const q: any = { ...query };
    if (q.page) q.page = Number(q.page);
    if (q.limit) q.limit = Number(q.limit);
    if (q.minRating) q.minRating = Number(q.minRating);
    return this.restaurantsService.findAll(q);
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Req() req: any, @Body() dto: CreateRestaurantDto) {
    const ownerId = req.user?.sub || dto.ownerId;
    return this.restaurantsService.create(dto, ownerId);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantDto,
  ) {
    const requesterId = req.user?.sub ?? req.user?.id;
    return this.restaurantsService.update(id, dto, requesterId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const requesterId = req.user?.sub ?? req.user?.id;
    return this.restaurantsService.remove(id, requesterId);
  }

  @Post(':id/menus')
  @UseGuards(AuthGuard)
  async addMenu(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMenuDto,
  ) {
    const requesterId = req.user?.sub ?? req.user?.id;
    return this.restaurantsService.createMenu(id, dto, requesterId);
  }

  @Put('menus/:menuId')
  @UseGuards(AuthGuard)
  async editMenu(
    @Req() req: any,
    @Param('menuId', ParseIntPipe) menuId: number,
    @Body() dto: UpdateMenuDto,
  ) {
    const requesterId = req.user?.sub ?? req.user?.id;
    return this.restaurantsService.updateMenu(menuId, dto, requesterId);
  }

  @Delete('menus/:menuId')
  @UseGuards(AuthGuard)
  async deleteMenu(
    @Req() req: any,
    @Param('menuId', ParseIntPipe) menuId: number,
  ) {
    const requesterId = req.user?.sub ?? req.user?.id;
    return this.restaurantsService.deleteMenu(menuId, requesterId);
  }

  @Get('categories')
  async listCategories() {
    return this.categoriesService ? this.categoriesService.findAll() : [];
  }

  @Get('categories/:id')
  async getCategory(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService
      ? this.categoriesService.findOne(Number(id))
      : null;
  }

  @Post('categories')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'vendor')
  async createCategory(@Req() req: any, @Body() dto: CreateCategoryDto) {
    if (!this.categoriesService) return null;

    return this.categoriesService.create(dto);
  }

  @Put('categories/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'vendor')
  async updateCategory(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    if (!this.categoriesService) return null;
    return this.categoriesService.update(Number(id), dto);
  }

  @Delete('categories/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'vendor')
  async deleteCategory(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    if (!this.categoriesService) return null;
    return this.categoriesService.remove(Number(id));
  }
}
