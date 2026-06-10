import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { Payment, PaymentDocument, PaymentStatus } from '../payment/entities/payment.entity';
import { HistoryDocument, HistoryRecord } from '../history/entity/history.entity';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(HistoryRecord.name)
    private readonly historyModel: Model<HistoryDocument>,

    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  // ─── Overview Cards ────────────────────────────────────────────────────────

  async getOverview() {
    const [totalUsers, totalSubmissions, totalPayments, revenueResult] =
      await Promise.all([
        // Total Users card
        this.userModel.countDocuments(),

        // Doc Submissions card — total AI history records
        this.historyModel.countDocuments(),

        // Total Payments card — only succeeded payments
        this.paymentModel.countDocuments({ status: PaymentStatus.SUCCEEDED }),

        // Total Revenue card — sum of succeeded payment amounts
        this.paymentModel.aggregate([
          { $match: { status: PaymentStatus.SUCCEEDED } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

    const totalRevenue = revenueResult[0]?.total ?? 0;

    return {
      totalUsers,
      totalSubmissions,
      totalPayments,
      totalRevenue, // in USD (amount is already stored as dollars in your Payment entity)
    };
  }

  // ─── User Growth Chart (monthly, by year) ─────────────────────────────────

  async getUserGrowthChart(year?: number) {
    const targetYear = year ?? new Date().getFullYear();

    const data = await this.userModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${targetYear}-01-01`),
            $lte: new Date(`${targetYear}-12-31T23:59:59`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const monthlyMap = new Map(data.map((d) => [d._id.month, d.count]));
    const chartData = MONTHS.map((month, i) => ({
      month,
      users: monthlyMap.get(i + 1) ?? 0,
    }));

    return { year: targetYear, chartData };
  }

  // ─── Revenue Overview Chart (monthly, by year) ────────────────────────────

  async getRevenueChart(year?: number) {
    const targetYear = year ?? new Date().getFullYear();

    const data = await this.paymentModel.aggregate([
      {
        $match: {
          status: PaymentStatus.SUCCEEDED,
          createdAt: {
            $gte: new Date(`${targetYear}-01-01`),
            $lte: new Date(`${targetYear}-12-31T23:59:59`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const monthlyMap = new Map(data.map((d) => [d._id.month, { revenue: d.revenue, count: d.count }]));
    const chartData = MONTHS.map((month, i) => ({
      month,
      revenue: monthlyMap.get(i + 1)?.revenue ?? 0,
      count: monthlyMap.get(i + 1)?.count ?? 0,
    }));

    return { year: targetYear, chartData };
  }

  // ─── Recent Payments ───────────────────────────────────────────────────────

  async getRecentPayments(limit = 5) {
    const payments = await this.paymentModel
      .find({ status: PaymentStatus.SUCCEEDED })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        'paymentId amount currency paymentMethod status description nameOnCard email country createdAt stripePaymentIntentId',
      );

    return payments;
  }

  // ─── Full Dashboard (single call, parallel queries) ────────────────────────

  async getDashboard(year?: number) {
    const [overview, userGrowth, revenue, recentPayments] = await Promise.all([
      this.getOverview(),
      this.getUserGrowthChart(year),
      this.getRevenueChart(year),
      this.getRecentPayments(5),
    ]);

    return { overview, userGrowth, revenue, recentPayments };
  }
}