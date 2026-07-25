import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import pick from 'src/app/helpers/pick';
import AuthGuard from 'src/app/middlewares/auth.guard';
import { CreateHistoryDto } from './dto/create.history.dto';
import { RequestSuggestedCitiesDto } from './dto/request-suggested-cities.dto';
import { RequestTourPlanDto } from './dto/request-tour-plan.dto';
import { UpdateHistoryDto } from './dto/update.history.dto';
import { HistoryService } from './history.service';

@ApiTags('History')
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a history record',
    description:
      'Stores a complete history record directly when the caller already has the final analysis payload.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @HttpCode(HttpStatus.CREATED)
  async createHistory(@Body() createHistoryDto: CreateHistoryDto, @Req() req: Request) {
    const result = await this.historyService.createHistory(createHistoryDto, req.user!.id);
    return {
      message: 'History created successfully',
      data: result,
    };
  }

  @Post('suggested-cities')
  @ApiOperation({
    summary: 'Run AI suggested city analysis after payment',
    description:
      'Validates the Stripe payment intent, calls the external AI suggested-city route, and stores the preview result in history.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @HttpCode(HttpStatus.CREATED)
  async generateSuggestedCities(
    @Body() dto: RequestSuggestedCitiesDto,
    @Req() req: Request,
  ) {
    const result = await this.historyService.generateSuggestedCities(dto, req.user!.id);
    return {
      message: 'Suggested cities generated successfully',
      data: result,
    };
  }

  @Post('tour-plan')
  @ApiOperation({
    summary: 'Get full AI tour plan for a selected city',
    description:
      'Calls the external AI tour-plan route using the stored session id and updates the matching history record with the full itinerary.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @HttpCode(HttpStatus.OK)
  async generateTourPlan(@Body() dto: RequestTourPlanDto, @Req() req: Request) {
    const result = await this.historyService.generateTourPlan(dto, req.user!.id);
    return {
      message: 'Tour plan generated successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all history records (admin)' })
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'searchTerm', required: false, type: String })
  @ApiQuery({
    name: 'aiAnalysisStatus',
    required: false,
    enum: ['pending', 'suggested_cities_ready', 'completed', 'failed'],
  })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: ['unpaid', 'paid', 'refunded'] })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @UseGuards(AuthGuard('admin'))
  @HttpCode(HttpStatus.OK)
  async getAllHistory(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'aiAnalysisStatus', 'paymentStatus']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.historyService.getAllHistory(params, options);
    return {
      message: 'History fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get history records for a specific user (admin)' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'userId', required: true, type: String, description: 'User MongoDB ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @UseGuards(AuthGuard('admin'))
  @HttpCode(HttpStatus.OK)
  async getUserHistory(@Param('userId') userId: string, @Req() req: Request) {
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.historyService.getUserHistory(userId, options);
    return {
      message: 'User history fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get the history of the currently authenticated user',
  })
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @UseGuards(AuthGuard('admin', 'user'))
  @HttpCode(HttpStatus.OK)
  async getMyHistory(@Req() req: Request) {
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.historyService.getMyHistory(req.user!.id, options);
    return {
      message: 'History fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('by-payment/:paymentIntentId')
  @ApiOperation({
    summary: 'Get payment analysis/history for the authenticated user',
    description:
      'Used by the frontend after Stripe confirms payment. Returns payment status and the generated history once suggested cities are ready.',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'paymentIntentId',
    required: true,
    type: String,
    description: 'Stripe PaymentIntent ID',
  })
  @UseGuards(AuthGuard('user'))
  @HttpCode(HttpStatus.OK)
  async getMyHistoryByPaymentIntent(
    @Param('paymentIntentId') paymentIntentId: string,
    @Req() req: Request,
  ) {
    const result = await this.historyService.getMyHistoryByPaymentIntent(
      paymentIntentId,
      req.user!.id,
    );

    return {
      message: 'Payment history fetched successfully',
      data: result,
    };
  }

  @Get('my/:id')
  @ApiOperation({ summary: 'Get a single history record of the authenticated user' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', required: true, type: String, description: 'History ID' })
  @UseGuards(AuthGuard('admin', 'user'))
  @HttpCode(HttpStatus.OK)
  async getMySingleHistory(@Param('id') id: string, @Req() req: Request) {
    const result = await this.historyService.getMySingleHistory(id, req.user!.id);
    return {
      message: 'History fetched successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single history record by ID (admin)' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', required: true, type: String, description: 'History ID' })
  @UseGuards(AuthGuard('admin'))
  @HttpCode(HttpStatus.OK)
  async getSingleHistory(@Param('id') id: string) {
    const result = await this.historyService.getSingleHistory(id);
    return {
      message: 'History fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a history record (admin)',
    description:
      'Lets admins patch a history record, including payment status or stored AI output fields.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({ name: 'id', required: true, type: String, description: 'History ID' })
  @HttpCode(HttpStatus.OK)
  async updateHistory(
    @Param('id') id: string,
    @Body() updateHistoryDto: UpdateHistoryDto,
  ) {
    const result = await this.historyService.updateHistory(id, updateHistoryDto);
    return {
      message: 'History updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a history record (admin)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({ name: 'id', required: true, type: String, description: 'History ID' })
  @HttpCode(HttpStatus.OK)
  async deleteHistory(@Param('id') id: string) {
    const result = await this.historyService.deleteHistory(id);
    return {
      message: 'History deleted successfully',
      data: result,
    };
  }
}
