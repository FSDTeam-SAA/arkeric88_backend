import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
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
import { HistoryService } from './history.service';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';
import { CreateHistoryDto } from './dto/create.history.dto';
import { UpdateHistoryDto } from './dto/update.history.dto';

@ApiTags('History')
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  // ─── Admin: Create a history record ───────────────────────────────────────
  // Typically called by your AI team / backend webhook after analysis is done

  @Post()
  @ApiOperation({
    summary: 'Create a history record (admin / AI team)',
    description:
      'Called after the AI analysis is complete. Stores the full AI-generated travel recommendation along with payment and user profile data.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @HttpCode(HttpStatus.CREATED)
  async createHistory(@Body() createHistoryDto: CreateHistoryDto, @Req() req: Request) {
    console.log(req.user!.id);
    const result = await this.historyService.createHistory(createHistoryDto, req.user!.id);
    return {
      message: 'History created successfully',
      data: result,
    };
  }

  // ─── Admin: Get all history records (paginated + filterable) ──────────────

  @Get()
  @ApiOperation({ summary: 'Get all history records (admin)' })
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'searchTerm', required: false, type: String })
  @ApiQuery({ name: 'aiAnalysisStatus', required: false, enum: ['pending', 'completed', 'failed'] })
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

  // ─── Admin: Get all history records of a specific user ────────────────────

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

  // ─── User: Get my own history (paginated) ─────────────────────────────────

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

  // ─── User: Get a single history record (own) ──────────────────────────────

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

  // ─── Admin: Get single history record by id ───────────────────────────────

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

  // ─── Admin: Update history record (AI pushes analysis result) ─────────────

  @Put(':id')
  @ApiOperation({
    summary: 'Update a history record (admin / AI team)',
    description:
      'Used by the AI team to push analysis results, update payment status, or patch any field.',
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

  // ─── Admin: Delete history record ─────────────────────────────────────────

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