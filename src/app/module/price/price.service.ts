import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Price, PriceDocument } from './entity/price.entity';
import { CreatePriceDto } from './dto/price-create.dto';
import { UpdatePriceDto } from './dto/price-update.dto';

@Injectable()
export class PriceService {
  constructor(
    @InjectModel(Price.name)
    private readonly priceModel: Model<PriceDocument>,
  ) {}

  async createPrice(createPriceDto: CreatePriceDto) {
    if (!createPriceDto.price) {
      throw new HttpException('Price is required', 400);
    }

    return this.priceModel.create(createPriceDto);
  }

  async updatePrice(id: string, updatePriceDto: UpdatePriceDto) {
    const price = await this.priceModel.findById(id);
    if (!price) {
      throw new HttpException('Price not found', 404);
    }

    return this.priceModel.findByIdAndUpdate(id, updatePriceDto, {
      new: true,
    });
  }
}