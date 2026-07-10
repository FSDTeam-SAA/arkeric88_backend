import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentResponseDto } from './dto/payment-response.dto';
import AuthGuard from 'src/app/middlewares/auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /payments
   * Creates a Stripe PaymentIntent and returns the clientSecret
   * for the frontend Stripe.js SDK to complete the payment.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for one-time payment' })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: CreatePaymentDto })
  @ApiOkResponse({ type: CreatePaymentResponseDto })
  @UseGuards(AuthGuard('user'))
  async createPaymentIntent(
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ): Promise<CreatePaymentResponseDto> {
    const data = await this.paymentService.createPaymentIntent(dto, req.user!.id);
    return {
      message: 'Payment intent created successfully',
      data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all payment records' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiQuery({ name: 'searchTerm', required: false, type: String, description: 'Search by description, name, country, or zip code' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter payments by status' })
  @ApiQuery({ name: 'currency', required: false, type: String, description: 'Filter payments by currency' })
  @ApiQuery({ name: 'nameOnCard', required: false, type: String, description: 'Filter payments by cardholder name' })
  @ApiQuery({ name: 'country', required: false, type: String, description: 'Filter payments by billing country' })
  @ApiQuery({ name: 'zipCode', required: false, type: String, description: 'Filter payments by billing zip code' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Items per page (default 10)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt', description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc', description: 'Sort order' })
  async getAllPayments(@Req() req: Request) {
    const filters = this.paymentService.buildPaymentFilter(req.query);
    const options = this.paymentService.buildPaginationOptions(req.query);
    const result = await this.paymentService.findAll(filters, options);
    return {
      message: 'Payments retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }


  /**
   * GET /payments/:id
   * Retrieve a payment record by its internal MongoDB ID.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'MongoDB payment document ID' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  async getPayment(@Param('id') id: string) {
    const payment = await this.paymentService.findById(id);
    return {
      message: 'Payment retrieved successfully',
      data: payment,
    };
  }
}
