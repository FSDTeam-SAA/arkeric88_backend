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
  cityName: string;
  countryName: string;
  cityImage: string[];
  latitude: number;
  longitude: number;
  numberOfDays: number;
  description: string;
}

export class RetreatScoreBreakdown {
  archetype: number;
  transform_focus: number;
  emotional_tone: number;
  structure: number;
  physical_intensity: number;
  party_social: number;
  emotional_safety: number;
  nature: number;
  luxury: number;
  spirituality: number;
}

export class RetreatRecommendation {
  propertyId: string;
  propertyName: string;
  country: string;
  region: string;
  settings: string[];
  matchScore: number;
  scoreBreakdown: RetreatScoreBreakdown;
  matchReasons: string[];
  warnings: string[];
  restrictionStatus: string;
  avgNight?: number;
  avgNightIsLowerBound?: boolean;
  avgNightRaw?: string;
  budgetTier?: string;
  programCost?: string;
  bestSeason: number[];
  bestSeasonRaw?: string;
}

export class ExtractedRestrictions {
  codes: string[];
  accessibilityNeeds: string[];
  unresolvedText: string[];
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
  recommendationSessionId?: string;

  @Prop()
  schemaVersion?: string;

  @Prop()
  scoringVersion?: string;

  @Prop()
  answerMappingVersion?: string;

  @Prop()
  databaseVersion?: string;

  @Prop({ index: true, sparse: true })
  activitySessionId?: string;

  @Prop({ type: [Object], default: [] })
  suggestedCities: SuggestedCity[];

  @Prop({ type: [Object], default: [] })
  retreatRecommendations: RetreatRecommendation[];

  @Prop()
  excludedCount?: number;

  @Prop()
  totalCandidateCount?: number;

  @Prop({ type: Object })
  extractedRestrictions?: ExtractedRestrictions;

  @Prop({ type: [String], default: [] })
  dataGaps: string[];

  @Prop()
  selectedCity?: string;

  @Prop({ index: true, sparse: true })
  selectedPropertyId?: string;

  @Prop({ type: Object })
  stay?: StayDetails;

  @Prop({ type: [Object], default: [] })
  tourPlan: TourPlanDay[];

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
