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
  propertyId?: string;
  cityName: string;
  countryName: string;
  cityImage: string[];
  latitude: number;
  longitude: number;
  numberOfDays: number;
  description: string;
  matchScore?: number;
  matchReasons: string[];
  warnings: string[];
  restrictionVerification?: string;
  nightlyPrice?: string;
  nightlyPriceIsLowerBound?: boolean;
  budgetTier?: string;
  packageType?: string;
  bestSeason?: string;
  settings: string[];
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
  activitySessionId?: string;

  @Prop({ type: [Object], default: [] })
  suggestedCities: SuggestedCity[];

  @Prop()
  selectedCity?: string;

  @Prop()
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
