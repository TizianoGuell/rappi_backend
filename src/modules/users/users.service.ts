import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Address } from './address.entity';
import { CreateAddressDto } from './dtos/create-address.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UpdateAddressDto } from './dtos/update-address.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Address) private addressRepo: Repository<Address>,
  ) {}

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId } as any,
      relations: ['role', 'addresses'],
    });
    if (!user) throw new NotFoundException('User not found');

  // Avoid using `delete` on a required entity property (TS2790).
  // Create a shallow copy and remove the password from the returned object.
  const result = { ...user } as any;
  if (result.password) delete result.password;
  return result;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOneBy({ id: userId } as any);
    if (!user) throw new NotFoundException('User not found');

    if ((dto as any).nombre) user.nombre = (dto as any).nombre;
    if ((dto as any).name) user.nombre = (dto as any).name;
    if ((dto as any).telefono) user.telefono = (dto as any).telefono;
    if ((dto as any).phone) user.telefono = (dto as any).phone;

    return this.userRepo.save(user);
  }

  async listAddresses(userId: number) {
    return this.addressRepo.find({ where: { user: { id: userId } as any } });
  }

  async createAddress(userId: number, dto: CreateAddressDto) {
    const user = await this.userRepo.findOneBy({ id: userId } as any);
    if (!user) throw new NotFoundException('User not found');

    if ((dto as any).is_default) {
      await this.addressRepo.update({ user: { id: userId } as any }, {
        is_default: false,
      } as any);
    }

    const address = this.addressRepo.create({ ...dto, user } as any);

    this.isAddressInServiceArea(address as any);
    return this.addressRepo.save(address);
  }

  isAddressInServiceArea(address: any): boolean {
    return true;
  }

  async updateAddress(
    userId: number,
    addressId: number,
    dto: UpdateAddressDto,
  ) {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, user: { id: userId } as any },
    });
    if (!address) throw new NotFoundException('Address not found');
    if ((dto as any).is_default) {
      await this.addressRepo.update({ user: { id: userId } as any }, {
        is_default: false,
      } as any);
    }
    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async deleteAddress(userId: number, addressId: number) {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, user: { id: userId } as any },
    });
    if (!address) throw new NotFoundException('Address not found');
    await this.addressRepo.remove(address);
    return { deleted: true };
  }

  async getOrderHistory(userId: number) {
    return [];
  }
}
