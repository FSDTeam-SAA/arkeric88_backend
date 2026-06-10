import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import AuthGuard from 'src/app/middlewares/auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('admin'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ─── Full dashboard in one call ────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Get full dashboard data',
    description:
      'Returns overview cards, user growth chart, revenue chart, and recent payments in a single call.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    example: 2026,
    description: 'Year for chart data. Defaults to current year.',
  })
  @HttpCode(HttpStatus.OK)
  async getDashboard(@Query('year') year?: string) {
    const result = await this.dashboardService.getDashboard(
      year ? Number(year) : undefined,
    );
    return {
      message: 'Dashboard data fetched successfully',
      data: result,
    };
  }

  // ─── Individual endpoints (optional — for partial refresh) ─────────────────

  @Get('overview')
  @ApiOperation({ summary: 'Get overview stat cards only' })
  @HttpCode(HttpStatus.OK)
  async getOverview() {
    const result = await this.dashboardService.getOverview();
    return {
      message: 'Overview fetched successfully',
      data: result,
    };
  }

  @Get('user-growth')
  @ApiOperation({ summary: 'Get user growth chart data (monthly)' })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2026 })
  @HttpCode(HttpStatus.OK)
  async getUserGrowth(@Query('year') year?: string) {
    const result = await this.dashboardService.getUserGrowthChart(
      year ? Number(year) : undefined,
    );
    return {
      message: 'User growth data fetched successfully',
      data: result,
    };
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue chart data (monthly)' })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2026 })
  @HttpCode(HttpStatus.OK)
  async getRevenue(@Query('year') year?: string) {
    const result = await this.dashboardService.getRevenueChart(
      year ? Number(year) : undefined,
    );
    return {
      message: 'Revenue data fetched successfully',
      data: result,
    };
  }

  @Get('recent-payments')
  @ApiOperation({ summary: 'Get recent payments list' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 5,
    description: 'Number of recent payments to return. Default is 5.',
  })
  @HttpCode(HttpStatus.OK)
  async getRecentPayments(@Query('limit') limit?: string) {
    const result = await this.dashboardService.getRecentPayments(
      limit ? Number(limit) : 5,
    );
    return {
      message: 'Recent payments fetched successfully',
      data: result,
    };
  }
}