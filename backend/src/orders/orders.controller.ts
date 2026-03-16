import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.BUYER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Place a new order (Buyer only)' })
  placeOrder(@CurrentUser() user: Express.User, @Body() dto: CreateOrderDto) {
    return this.ordersService.placeOrder(user.id, dto);
  }

  @Get()
  @Roles(Role.BUYER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List own orders (Buyer only)' })
  findMyOrders(
    @CurrentUser() user: Express.User,
    @Query() query: PaginationDto,
  ) {
    return this.ordersService.findMyOrders(user.id, query);
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all orders (Admin only)' })
  findAllAdmin(@Query() query: PaginationDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get(':id')
  @Roles(Role.BUYER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get order detail (Buyer only)' })
  findOrderById(@CurrentUser() user: Express.User, @Param('id') id: string) {
    return this.ordersService.findOrderById(user.id, id);
  }
}
