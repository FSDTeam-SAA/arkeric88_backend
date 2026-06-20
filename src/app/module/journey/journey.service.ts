import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import { Journey, JourneyDocument } from './entity/journey.entity';
import { CreateJourneyDto } from './dto/journey-create.dto';
import { UpdateJourneyDto } from './dto/journey-update.dto';

const journeySearchAbleFields = [
  'title',
  'emotion',
  'tagline',
  'tags',
  'status',
];

@Injectable()
export class JourneyService {
  constructor(
    @InjectModel(Journey.name)
    private readonly journeyModel: Model<JourneyDocument>,
  ) {}

  async createJourney(
    createJourneyDto: CreateJourneyDto,
    file?: Express.Multer.File,
  ) {
    if (!createJourneyDto.title) {
      throw new HttpException('Journey title is required', 400);
    }
    if (!createJourneyDto.emotion || createJourneyDto.emotion.length === 0) {
      throw new HttpException('At least one emotion is required', 400);
    }

    if (file) {
      const uploadedFile = await fileUpload.uploadToCloudinary(file);
      createJourneyDto.image = uploadedFile.url;
    }

    return this.journeyModel.create(createJourneyDto);
  }

  async getAllJourney(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      journeySearchAbleFields,
    );

    const total = await this.journeyModel.countDocuments(whereConditions);
    const journeys = await this.journeyModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    return {
      meta: { page, limit, total },
      data: journeys,
    };
  }

  async getSingleJourney(id: string) {
    const journey = await this.journeyModel.findById(id);
    if (!journey) {
      throw new HttpException('Journey not found', 404);
    }
    return journey;
  }

  async updateJourney(
    id: string,
    updateJourneyDto: UpdateJourneyDto,
    file?: Express.Multer.File,
  ) {
    const journey = await this.journeyModel.findById(id);
    if (!journey) {
      throw new HttpException('Journey not found', 404);
    }

    if (file) {
      const uploadedFile = await fileUpload.uploadToCloudinary(file);
      updateJourneyDto.image = uploadedFile.url;
    }

    return this.journeyModel.findByIdAndUpdate(id, updateJourneyDto, {
      new: true,
    });
  }

  async deleteJourney(id: string) {
    const journey = await this.journeyModel.findById(id);
    if (!journey) {
      throw new HttpException('Journey not found', 404);
    }
    return this.journeyModel.findByIdAndDelete(id);
  }
}