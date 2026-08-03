import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Param,
  Put,
} from '@nestjs/common';
import { PriceService } from './price.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import AuthGuard from 'src/app/middlewares/auth.guard';
import { CreatePriceDto } from './dto/price-create.dto';
import { UpdatePriceDto } from './dto/price-update.dto';

@ApiTags('Price')
@Controller('price')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get()
  @ApiOperation({ summary: 'Get current price' })
  @HttpCode(HttpStatus.OK)
  async getPrice() {
    const result = await this.priceService.getPrice();

    return {
      message: 'Price retrieved successfully',
      data: result,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create price' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        price: { type: 'number', example: 100 },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async createPrice(@Body() createPriceDto: CreatePriceDto) {
    const result = await this.priceService.createPrice(createPriceDto);

    return {
      message: 'Price created successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update price by id' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: UpdatePriceDto })
  @HttpCode(HttpStatus.OK)
  async updatePrice(
    @Param('id') id: string,
    @Body() updatePriceDto: UpdatePriceDto,
  ) {
    const result = await this.priceService.updatePrice(id, updatePriceDto);

    return {
      message: 'Price updated successfully',
      data: result,
    };
  }
}
