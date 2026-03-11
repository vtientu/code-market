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
import { Role } from '@generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { AddProductFileDto, AddProductImageDto } from './dto/add-file.dto.js';

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

  @Post(':id/files')
  @ApiOperation({ summary: 'Add downloadable file to product (Seller only)' })
  addFile(
    @CurrentUser() user: Express.User,
    @Param('id') id: string,
    @Body() dto: AddProductFileDto,
  ) {
    return this.productsService.addFile(user.id, id, dto);
  }

  @Delete(':id/files/:fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove file from product (Seller only)' })
  removeFile(
    @CurrentUser() user: Express.User,
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    return this.productsService.removeFile(user.id, id, fileId);
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
