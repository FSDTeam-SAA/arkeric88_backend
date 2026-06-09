import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import { HistoryDocument, HistoryRecord } from './entity/history.entity';
import { CreateHistoryDto } from './dto/create.history.dto';
import { UpdateHistoryDto } from './dto/update.history.dto';

const historySearchableFields = [
  'aiAnalysisStatus',
  'paymentStatus',
  'userProfile.zodiacSign',
  'recommendedJourney.destination',
];

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(HistoryRecord.name)
    private readonly historyModel: Model<HistoryDocument>,
  ) {}

  // ─── Create ────────────────────────────────────────────────────────────────

  async createHistory(createHistoryDto: CreateHistoryDto, userId: string): Promise<HistoryDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpException('Invalid user ID', 400);
    }
    return this.historyModel.create({ ...createHistoryDto, user: new Types.ObjectId(userId) });
  }

  // ─── Read All (admin) ──────────────────────────────────────────────────────

  async getAllHistory(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(params, historySearchableFields);

    const [total, data] = await Promise.all([
      this.historyModel.countDocuments(whereConditions),
      this.historyModel
        .find(whereConditions)
        .populate('user', 'fullName email profilePicture role')
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortOrder } as any),
    ]);

    return { meta: { page, limit, total }, data };
  }

  // ─── Read All for a specific user ─────────────────────────────────────────

  async getUserHistory(userId: string, options: IOptions) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpException('Invalid user ID', 400);
    }

    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const query = { user: new Types.ObjectId(userId) };

    const [total, data] = await Promise.all([
      this.historyModel.countDocuments(query),
      this.historyModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortOrder } as any),
    ]);

    return { meta: { page, limit, total }, data };
  }

  // ─── Read Single ───────────────────────────────────────────────────────────

  async getSingleHistory(id: string): Promise<HistoryDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid history ID', 400);
    }

    const history = await this.historyModel
      .findById(id)
      .populate('user', 'fullName email profilePicture role');

    if (!history) throw new HttpException('History not found', 404);
    return history;
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async updateHistory(id: string, updateHistoryDto: UpdateHistoryDto): Promise<HistoryDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid history ID', 400);
    }

    const history = await this.historyModel.findById(id);
    if (!history) throw new HttpException('History not found', 404);

    // Auto-stamp paidAt when payment flips to paid
    if (updateHistoryDto.paymentStatus === 'paid' && history.paymentStatus !== 'paid') {
      (updateHistoryDto as any).paidAt = new Date();
    }

    const updated = await this.historyModel.findByIdAndUpdate(
      id,
      { $set: updateHistoryDto },
      { new: true },
    );
    return updated!;
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async deleteHistory(id: string): Promise<HistoryDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid history ID', 400);
    }

    const history = await this.historyModel.findById(id);
    if (!history) throw new HttpException('History not found', 404);

    return this.historyModel.findByIdAndDelete(id) as Promise<HistoryDocument>;
  }

  // ─── My History ────────────────────────────────────────────────────────────

  async getMyHistory(userId: string, options: IOptions) {
    return this.getUserHistory(userId, options);
  }

  async getMySingleHistory(historyId: string, userId: string): Promise<HistoryDocument> {
    if (!Types.ObjectId.isValid(historyId)) {
      throw new HttpException('Invalid history ID', 400);
    }

    const history = await this.historyModel.findOne({
      _id: historyId,
      user: new Types.ObjectId(userId),
    });

    if (!history) throw new HttpException('History not found', 404);
    return history;
  }
}