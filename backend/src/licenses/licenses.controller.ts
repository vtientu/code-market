import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { LicensesService } from './licenses.service.js';

@ApiTags('Licenses')
@Controller('licenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all purchased licenses' })
  getMyLicenses(
    @CurrentUser() user: Express.User,
    @Query() query: PaginationDto,
  ) {
    return this.licensesService.getMyLicenses(user.id, query);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get license for a specific product' })
  getLicenseByProduct(
    @CurrentUser() user: Express.User,
    @Param('productId') productId: string,
  ) {
    return this.licensesService.getLicenseByProduct(user.id, productId);
  }

  @Post(':licenseKey/download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Download file using license key' })
  download(
    @CurrentUser() user: Express.User,
    @Param('licenseKey') licenseKey: string,
  ) {
    return this.licensesService.download(user.id, licenseKey);
  }
}
