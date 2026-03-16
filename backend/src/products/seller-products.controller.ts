import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { AddProductVersionDto, AddProductImageDto } from './dto/add-file.dto.js';

@ApiTags('Seller Products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER)
@ApiBearerAuth()
export class SellerProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('my')
  @ApiOperation({ summary: 'List own products (Seller only)' })
  findMy(@CurrentUser() user: Express.User, @Query() query: ProductQueryDto) {
    return this.productsService.findMySeller(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product listing (Seller only)' })
  create(@CurrentUser() user: Express.User, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update own product (Seller only, DRAFT/REJECTED only)',
  })
  update(
    @CurrentUser() user: Express.User,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own DRAFT product (Seller only)' })
  remove(@CurrentUser() user: Express.User, @Param('id') id: string) {
    return this.productsService.remove(user.id, id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit product for review (Seller only)' })
  submit(@CurrentUser() user: Express.User, @Param('id') id: string) {
    return this.productsService.submit(user.id, id);
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Add a new version to product (Seller only)' })
  addVersion(
    @CurrentUser() user: Express.User,
    @Param('id') id: string,
    @Body() dto: AddProductVersionDto,
  ) {
    return this.productsService.addVersion(user.id, id, dto);
  }

  @Delete(':id/versions/:versionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a version from product (Seller only)' })
  removeVersion(
    @CurrentUser() user: Express.User,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.productsService.removeVersion(user.id, id, versionId);
  }

  @Post(':id/images')
  @ApiOperation({ summary: 'Add image to product (Seller only)' })
  addImage(
    @CurrentUser() user: Express.User,
    @Param('id') id: string,
    @Body() dto: AddProductImageDto,
  ) {
    return this.productsService.addImage(user.id, id, dto);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove image from product (Seller only)' })
  removeImage(
    @CurrentUser() user: Express.User,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.removeImage(user.id, id, imageId);
  }
}
