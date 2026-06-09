import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../user/entities/user.entity';

export type HistoryDocument = HydratedDocument<HistoryRecord>;

// ─── Nested plain classes (no @Schema decorator needed for sub-docs) ──────────

export class TravelMatch {
  rank: number;
  destination: string;
  country: string;
  description: string;
  matchScore: number;
}

export class DayItinerary {
  day: number;
  title: string;
  description: string;
}

export class RecommendedJourney {
  destination: string;
  homeBase: string;
  homeBaseDescription: string;
  accommodationType?: string;
  accommodationFeatures: string[];
  itinerary: DayItinerary[];
}

export class UserProfile {
  zodiacSign: string;
  currentEnergy: string;
  emotionalState: string;
  seeking: string;
  travelStyle: string;
  preferredPace: string;
  budget: number;
  tripLengthDays: number;
  preferredEnvironments: string[];
}

// ─── Main Schema ─────────────────────────────────────────────────────────────

@Schema({ timestamps: true, collection: 'histories' })
export class HistoryRecord {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  user: Types.ObjectId;

  @Prop({ type: Object, required: true })
  userProfile: UserProfile;

  @Prop({ type: [String], default: [] })
  travelThemes: string[];

  @Prop({ type: [Object], default: [] })
  travelMatches: TravelMatch[];

  @Prop({ type: Object })
  recommendedJourney?: RecommendedJourney;

  @Prop()
  astroInsight?: string;

  @Prop({
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  })
  aiAnalysisStatus: string;

  @Prop({ required: true })
  paymentAmount: number;

  @Prop()
  stripePaymentIntentId?: string;

  @Prop({
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid',
  })
  paymentStatus: string;

  @Prop()
  paidAt?: Date;
}

export const HistorySchema = SchemaFactory.createForClass(HistoryRecord);

// Indexes for common queries
HistorySchema.index({ user: 1, createdAt: -1 });
HistorySchema.index({ paymentStatus: 1 });
HistorySchema.index({ aiAnalysisStatus: 1 });