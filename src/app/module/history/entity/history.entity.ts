import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../user/entities/user.entity';

export type HistoryDocument = HydratedDocument<HistoryRecord>;

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
  wellnessArchetype: string;
  wellnessNeeds: string[];
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

export class SuggestedCity {
  destinationId: string;
  /** @deprecated Present only on history documents created before the Velari migration. */
  propertyId?: string;
  cityName: string;
  countryName: string;
  worldRegion?: string;
  cityImage: string[];
  latitude: number | null;
  longitude: number | null;
  numberOfDays: number;
  description: string;
  matchScore?: number;
  scoreBreakdown?: Record<string, unknown>;
  matchReasons: string[];
  tradeoffs: string[];
  unresolvedFacts: string[];
  warnings: string[];
  restrictionChecks: Record<string, unknown>[];
  distanceCheck?: Record<string, unknown>;
  verification?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  /** @deprecated Legacy retreat-catalog field. */
  restrictionVerification?: string;
  nightlyPrice?: string;
  nightlyPriceIsLowerBound?: boolean;
  budgetTier?: string;
  packageType?: string;
  bestSeason?: string;
  settings?: string[];
}

export class Coordinates {
  lat: number;
  lng: number;
}

export class StayDetails {
  name: string;
  address: string;
  rating?: number;
  priceLevel?: string;
  photos: string[];
  coords?: Coordinates;
  averageNightlyPrice?: number;
  budgetTier?: string;
  facilities: string[];
  website?: string;
  estimateNote?: string;
  priceStatus?: string;
  availabilityStatus?: string;
}

export class FeelingBlock {
  title: string;
  feelings: Record<string, unknown>[];
  headline: string;
  intention: string;
  narrative?: string | null;
  markdown?: string;
  supportingExperiences: Record<string, unknown>[];
  note?: string;
  alignment?: Record<string, unknown>;
}

export class BudgetCheck {
  budgetPerNightUsd: number;
  budgetOpenEnded: boolean;
  rooms: number;
  estimatedStayNightlyUsd?: number | null;
  stayWithinBudget?: boolean | null;
  status: string;
  note: string;
}

export class TourActivity {
  activityName: string;
  activityDescription: string;
  activityLocation: string;
  activityAddress: string;
  activityImage: string[];
  activityTime: string;
  activityCost: number;
  distanceFromPreviousKm?: number | null;
  placeId: string | null;
  businessStatus?: string;
  availabilityNote: string;
}

export class TourPlanDay {
  day: number;
  activities: TourActivity[];
}

@Schema({ timestamps: true, collection: 'histories' })
export class HistoryRecord {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    // required: true,
    index: true,
  })
  user: Types.ObjectId;

  @Prop({ type: Object, required: true })
  userProfile: UserProfile;

  @Prop({ type: Object })
  questionnaireAnswers?: Record<string, unknown>;

  @Prop({ type: Object })
  intake?: Record<string, unknown>;

  @Prop()
  preferredDestinations?: string;

  @Prop()
  hopeOfThisTrip?: string;

  @Prop({ type: [String], default: [] })
  travelThemes: string[];

  @Prop({ type: [Object], default: [] })
  travelMatches: TravelMatch[];

  @Prop({ type: Object })
  recommendedJourney?: RecommendedJourney;

  @Prop()
  astroInsight?: string;

  @Prop({
    enum: ['pending', 'suggested_cities_ready', 'completed', 'failed'],
    default: 'pending',
  })
  aiAnalysisStatus: string;

  @Prop({ index: true, sparse: true })
  aiSessionId?: string;

  @Prop({ index: true, sparse: true })
  activitySessionId?: string;

  @Prop({ type: [Object], default: [] })
  suggestedCities: SuggestedCity[];

  @Prop({ enum: ['matched', 'no_valid_result'] })
  matchStatus?: string;

  @Prop({ type: Object })
  noValidResult?: Record<string, unknown>;

  @Prop({ type: [Object], default: [] })
  clarifications: Record<string, unknown>[];

  @Prop({ type: Object })
  guestContext?: Record<string, unknown>;

  @Prop()
  eligibleCount?: number;

  @Prop()
  excludedCount?: number;

  @Prop()
  totalCandidateCount?: number;

  @Prop({ type: Object })
  excludedByReason?: Record<string, unknown>;

  @Prop({ type: [String], default: [] })
  dataGaps: string[];

  @Prop({ type: Object })
  origin?: Record<string, unknown>;

  @Prop()
  estimateStatus?: string;

  @Prop()
  generatedAtUtc?: string;

  @Prop({ type: Object })
  intakeForm?: unknown;

  @Prop()
  catalogVersion?: string;

  @Prop()
  intakeMappingVersion?: string;

  @Prop()
  scoringVersion?: string;

  @Prop()
  selectedCity?: string;

  @Prop()
  selectedPropertyId?: string;

  @Prop({ index: true, sparse: true })
  selectedDestinationId?: string;

  @Prop({ type: Object })
  stay?: StayDetails;

  @Prop({ type: [Object], default: [] })
  tourPlan: TourPlanDay[];

  @Prop({ type: Object })
  feelingBlock?: FeelingBlock;

  @Prop({ type: Object })
  budgetCheck?: BudgetCheck;

  @Prop()
  totalCostEstimate?: number;

  @Prop()
  packingTips?: string;

  @Prop()
  travelTips?: string;

  @Prop()
  source?: string;

  @Prop({ type: Object })
  suggestedCityResponse?: Record<string, unknown>;

  @Prop({ type: Object })
  tourPlanResponse?: Record<string, unknown>;

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

HistorySchema.index({ user: 1, createdAt: -1 });
HistorySchema.index({ paymentStatus: 1 });
HistorySchema.index({ aiAnalysisStatus: 1 });
