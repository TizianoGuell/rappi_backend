import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartService } from './cart.service';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Menu } from '../restaurants/menu.entity';

describe('CartService', () => {
  let service: CartService;
  let cartRepo: Repository<Cart>;
  let itemRepo: Repository<CartItem>;
  let menuRepo: Repository<Menu>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useClass: Repository },
        { provide: getRepositoryToken(CartItem), useClass: Repository },
        { provide: getRepositoryToken(Menu), useClass: Repository },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    cartRepo = module.get(getRepositoryToken(Cart));
    itemRepo = module.get(getRepositoryToken(CartItem));
    menuRepo = module.get(getRepositoryToken(Menu));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
