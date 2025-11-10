import {
  Controller,
  Get,
  Put,
  Body,
  Post,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { CreateAddressDto } from './dtos/create-address.dto';
import { UpdateAddressDto } from './dtos/update-address.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.sub, dto as any);
  }

  @Get('addresses')
  @UseGuards(AuthGuard)
  async getAddresses(@Req() req: any) {
    return this.usersService.listAddresses(req.user.sub);
  }

  @Post('addresses')
  @UseGuards(AuthGuard)
  async createAddress(@Req() req: any, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(req.user.sub, dto);
  }

  @Put('addresses/:id')
  @UseGuards(AuthGuard)
  async updateAddress(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(req.user.sub, id, dto);
  }

  @Delete('addresses/:id')
  @UseGuards(AuthGuard)
  async deleteAddress(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteAddress(req.user.sub, id);
  }
}
