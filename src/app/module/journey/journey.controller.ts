import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  UseGuards,
  UploadedFile,
  Req,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { JourneyService } from './journey.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileUpload } from 'src/app/helpers/fileUploder';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import AuthGuard from 'src/app/middlewares/auth.guard';
import type { Request } from 'express';
import pick from 'src/app/helpers/pick';
import { CreateJourneyDto } from './dto/journey-create.dto';
import { UpdateJourneyDto } from './dto/journey-update.dto';

@ApiTags('Journey')
@Controller('journey')
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Post()
  @ApiOperation({ summary: 'Create journey' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('admin'))
  @UseInterceptors(FileInterceptor('image', fileUpload.uploadConfig))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Japan' },
        emotion: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['calm', 'adventure', 'romantic', 'luxury', 'cultural'],
          },
          example: ['calm', 'romantic'],
        },
        image: { type: 'string', format: 'binary' },
        tagline: { type: 'string', example: 'For the calm seeker' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['Calm Luxury'],
        },
        description: { type: 'string', example: '' },
        order: { type: 'number', example: 0 },
        isFeatured: { type: 'boolean' },
        status: { type: 'string', enum: ['active', 'inactive'] },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async createJourney(
    @Body() createJourneyDto: CreateJourneyDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.journeyService.createJourney(
      createJourneyDto,
      file,
    );

    return {
      message: 'Journey created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all journeys' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
  })
  @ApiQuery({ name: 'title', required: false, type: String, example: '' })
  @ApiQuery({
    name: 'emotion',
    required: false,
    type: String,
    example: '',
    description:
      'Filter journeys that include this emotion (calm, adventure, ...)',
  })
  @ApiQuery({ name: 'status', required: false, type: String, example: '' })
  @ApiQuery({
    name: 'isFeatured',
    required: false,
    type: Boolean,
    example: true,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'order',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'asc',
  })
  @HttpCode(HttpStatus.OK)
  async getAllJourney(@Req() req: Request) {
    const params = pick(req.query, [
      'searchTerm',
      'title',
      'emotion',
      'status',
      'isFeatured',
    ]);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.journeyService.getAllJourney(params, options);

    return {
      message: 'Journey fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single journey by id' })
  @ApiParam({ name: 'id', required: true, type: String, example: '' })
  @HttpCode(HttpStatus.OK)
  async getSingleJourney(@Param('id') id: string) {
    const result = await this.journeyService.getSingleJourney(id);

    return {
      message: 'Journey fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update journey by id' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('admin'))
  @UseInterceptors(FileInterceptor('image', fileUpload.uploadConfig))
  @ApiBody({ type: UpdateJourneyDto })
  @HttpCode(HttpStatus.OK)
  async updateJourney(
    @Param('id') id: string,
    @Body() updateJourneyDto: UpdateJourneyDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.journeyService.updateJourney(
      id,
      updateJourneyDto,
      file,
    );

    return {
      message: 'Journey updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete journey by id' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({ name: 'id', required: true, type: String, example: '' })
  @HttpCode(HttpStatus.OK)
  async deleteJourney(@Param('id') id: string) {
    const result = await this.journeyService.deleteJourney(id);

    return {
      message: 'Journey deleted successfully',
      data: result,
    };
  }
}