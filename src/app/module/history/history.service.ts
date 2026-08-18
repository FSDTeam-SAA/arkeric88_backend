import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from '../payment/entities/payment.entity';
import { CreateHistoryDto } from './dto/create.history.dto';
import { RequestSuggestedCitiesDto } from './dto/request-suggested-cities.dto';
import { RequestTourPlanDto } from './dto/request-tour-plan.dto';
import { RegenerateSuggestedCitiesDto } from './dto/regenerate-suggested-cities.dto';
import { RegenerateTourPlanDto } from './dto/regenerate-tour-plan.dto';
import { UpdateHistoryDto } from './dto/update.history.dto';
import {
  Coordinates,
  HistoryDocument,
  HistoryRecord,
  RecommendedJourney,
  StayDetails,
  SuggestedCity,
  TourPlanDay,
  UserProfile,
} from './entity/history.entity';
import { HistoryAiClient } from './history-ai.client';
import { normalizeQuestionnaireAnswers } from './wellness-archetypes';

const historySearchableFields = [
  'aiAnalysisStatus',
  'paymentStatus',
  'userProfile.zodiacSign',
  'recommendedJourney.destination',
  'aiSessionId',
  'selectedCity',
];

type SuggestedCityApiItem = {
  property_id?: string;
  property_name?: string;
  city_name?: string;
  country_name?: string;
  city_image?: string[];
  latitude?: number;
  longitude?: number;
  number_of_days?: number;
  description?: string;
  match_score?: number;
  match_reasons?: string[];
  warnings?: string[];
  trade_offs?: string[];
  restriction_verification?: string;
  nightly_price?: string | number;
  nightly_price_is_lower_bound?: boolean;
  price_is_lower_bound?: boolean;
  budget_tier?: string;
  package_type?: string;
  package_or_a_la_carte?: string;
  best_season?: string;
  settings?: string[];
};

type TourActivityApiItem = {
  activity_name?: string;
  activity_description?: string;
  activity_location?: string;
  activity_address?: string;
  activity_image?: string[];
  activity_time?: string;
  activity_cost?: number;
  distance_from_previous_km?: number | null;
};

type TourPlanDayApiItem = {
  day?: number;
  activities?: TourActivityApiItem[];
};

type TourPlanApiResponse = {
  activity_session_id?: string;
  city?: string;
  stay?: {
    name?: string;
    address?: string;
    rating?: number;
    price_level?: string;
    photos?: string[];
    coords?: Coordinates;
  };
  tour_plan?: TourPlanDayApiItem[];
  total_cost_estimate?: number;
  packing_tips?: string;
  travel_tips?: string;
  source?: string;
};

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(HistoryRecord.name)
    private readonly historyModel: Model<HistoryDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly historyAiClient: HistoryAiClient,
  ) {}

  async createHistory(createHistoryDto: CreateHistoryDto, userId: string): Promise<HistoryDocument> {
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');
    return this.historyModel.create({ ...createHistoryDto, user: userObjectId });
  }

  async generateSuggestedCities(
    dto: RequestSuggestedCitiesDto,
    userId: string,
  ): Promise<{ history: HistoryDocument; aiResponse: Record<string, unknown> }> {
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');
    const payment = await this.findPaidPayment(dto.payment_intent_id);
    const normalizedDto = {
      ...dto,
      questions_answers: normalizeQuestionnaireAnswers(dto.questions_answers),
    };
    const aiResponse = await this.historyAiClient.getSuggestedCities(
      this.buildAiRecommendationRequest(normalizedDto.questions_answers),
    );

    const aiSessionId = this.asOptionalString(aiResponse?.session_id);
    if (!aiSessionId) {
      throw new InternalServerErrorException('AI response is missing session_id');
    }

    const historyData = {
      user: userObjectId,
      userProfile: this.buildUserProfile(normalizedDto),
      questionnaireAnswers: normalizedDto.questions_answers,
      preferredDestinations: normalizedDto.preferred_destinations,
      hopeOfThisTrip: normalizedDto.hope_of_this_trip,
      travelThemes: this.buildTravelThemes(normalizedDto),
      aiSessionId,
      suggestedCities: this.extractSuggestedCities(aiResponse),
      suggestedCityResponse: aiResponse,
      aiAnalysisStatus: 'suggested_cities_ready',
      paymentAmount: payment.amount,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      paymentStatus: 'paid',
      paidAt: payment.updatedAt ?? payment.createdAt,
    };

    const existingHistory = await this.historyModel.findOne({
      user: userObjectId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
    });

    const history = existingHistory
      ? await this.historyModel.findByIdAndUpdate(
          existingHistory._id,
          { $set: historyData },
          { new: true },
        )
      : await this.historyModel.create(historyData);

    return {
      history: history!,
      aiResponse,
    };
  }

  async generateSuggestedCitiesFromPayment(
    payment: PaymentDocument,
  ): Promise<{ history: HistoryDocument; aiResponse: Record<string, unknown> }> {
    if (!payment.user) {
      throw new HttpException('Payment is missing user information', 400);
    }

    if (!payment.stripePaymentIntentId) {
      throw new HttpException('Payment is missing Stripe payment intent id', 400);
    }

    const analysisRequest = payment.analysisRequest;
    if (!analysisRequest?.questions_answers) {
      throw new HttpException('Payment is missing questionnaire data', 400);
    }

    return this.generateSuggestedCities(
      {
        questions_answers: analysisRequest.questions_answers,
        preferred_destinations: analysisRequest.preferred_destinations,
        hope_of_this_trip: analysisRequest.hope_of_this_trip,
        payment_intent_id: payment.stripePaymentIntentId,
      },
      payment.user.toString(),
    );
  }

  async generateTourPlan(
    dto: RequestTourPlanDto,
    userId: string,
  ): Promise<{ history: HistoryDocument; aiResponse: Record<string, unknown> }> {
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');

    let history = await this.historyModel.findOne({
      user: userObjectId,
      aiSessionId: dto.session_id,
    });

    if (!history) {
      history = await this.historyModel
        .findOne({
          user: userObjectId,
          'suggestedCities.propertyId': dto.property_id,
        })
        .sort({ createdAt: -1 });
    }

    if (!history) {
      throw new HttpException('History session not found', 404);
    }

    const selectedProperty = history.suggestedCities.find(
      (suggestion) => suggestion.propertyId === dto.property_id,
    );
    if (!selectedProperty) {
      throw new HttpException('Selected property does not belong to this journey session', 404);
    }

    const requestedCity = dto.selected_city.trim().toLocaleLowerCase();
    const storedCity = history.selectedCity?.trim().toLocaleLowerCase();
    if (
      storedCity === requestedCity &&
      history.selectedPropertyId === dto.property_id &&
      history.tourPlan?.length
    ) {
      return {
        history,
        aiResponse: history.tourPlanResponse ?? {
          source: 'database-cache',
          tour_plan: history.tourPlan,
        },
      };
    }

    let aiResponse: TourPlanApiResponse & Record<string, unknown>;

    try {
      aiResponse = (await this.historyAiClient.getTourPlan({
        ...dto,
        session_id: history.aiSessionId || dto.session_id,
      })) as TourPlanApiResponse & Record<string, unknown>;
    } catch (error) {
      if (
        error instanceof HttpException &&
        typeof error.getResponse() === 'string' &&
        (error.getResponse() as string).toLowerCase().includes('session not found') &&
        history.questionnaireAnswers
      ) {
        const freshAiRes = (await this.historyAiClient.getSuggestedCities(
          this.buildAiRecommendationRequest(history.questionnaireAnswers),
        )) as Record<string, unknown>;
        const newSessionId = this.asOptionalString(freshAiRes?.session_id);

        if (newSessionId) {
          history.aiSessionId = newSessionId;
          await this.historyModel.findByIdAndUpdate(history._id, {
            $set: { aiSessionId: newSessionId },
          });

          aiResponse = (await this.historyAiClient.getTourPlan({
            ...dto,
            session_id: newSessionId,
          })) as TourPlanApiResponse & Record<string, unknown>;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    const stay = this.mapStay(aiResponse.stay);
    const tourPlan = this.mapTourPlan(aiResponse.tour_plan);
    const updated = await this.historyModel.findByIdAndUpdate(
      history._id,
      {
        $set: {
          activitySessionId: this.asOptionalString(aiResponse.activity_session_id),
          selectedCity: dto.selected_city,
          selectedPropertyId: dto.property_id,
          stay,
          tourPlan,
          totalCostEstimate: this.asOptionalNumber(aiResponse.total_cost_estimate),
          packingTips: this.asOptionalString(aiResponse.packing_tips),
          travelTips: this.asOptionalString(aiResponse.travel_tips),
          source: this.asOptionalString(aiResponse.source),
          tourPlanResponse: aiResponse,
          aiAnalysisStatus: 'completed',
          recommendedJourney: this.buildRecommendedJourney(dto.selected_city, stay, tourPlan),
        },
      },
      { new: true },
    );

    return {
      history: updated!,
      aiResponse,
    };
  }

  async regenerateSuggestedCities(
    dto: RegenerateSuggestedCitiesDto,
    userId: string,
  ): Promise<{ history: HistoryDocument; aiResponse: Record<string, unknown> }> {
    const history = await this.historyModel.findOne({
      user: this.toObjectId(userId, 'Invalid user ID'),
      aiSessionId: dto.session_id,
    });
    if (!history) {
      throw new HttpException('History session not found', 404);
    }

    const aiResponse = (await this.historyAiClient.regenerateSuggestedCities({
      session_id: dto.session_id,
      user_instruction: 'Show different destination options.',
    })) as Record<string, unknown>;
    const freshCities = this.extractSuggestedCities(aiResponse);
    const mergedCities = [...(history.suggestedCities || [])];
    freshCities.forEach((city) => {
      const exists = mergedCities.some((item) =>
        city.propertyId ? item.propertyId === city.propertyId : item.cityName === city.cityName,
      );
      if (!exists) mergedCities.push(city);
    });
    const updated = await this.historyModel.findByIdAndUpdate(
      history._id,
      {
        $set: {
          suggestedCities: mergedCities,
          suggestedCityResponse: aiResponse,
          selectedCity: undefined,
          selectedPropertyId: undefined,
          activitySessionId: undefined,
          stay: undefined,
          tourPlan: [],
          totalCostEstimate: undefined,
          packingTips: undefined,
          travelTips: undefined,
          tourPlanResponse: undefined,
          aiAnalysisStatus: 'suggested_cities_ready',
        },
      },
      { new: true },
    );

    return { history: updated!, aiResponse };
  }

  async regenerateTourPlan(
    dto: RegenerateTourPlanDto,
    userId: string,
  ): Promise<{ history: HistoryDocument; aiResponse: Record<string, unknown> }> {
    const history = await this.historyModel.findOne({
      user: this.toObjectId(userId, 'Invalid user ID'),
      activitySessionId: dto.activity_session_id,
    });
    if (!history) {
      throw new HttpException('Activity session not found', 404);
    }

    const aiResponse = (await this.historyAiClient.regenerateTourPlan({
      ...dto,
      user_instruction: dto.user_instruction || 'Regenerate this itinerary with different activities.',
    })) as TourPlanApiResponse &
      Record<string, unknown>;
    const tourPlan = this.mapTourPlan(aiResponse.tour_plan);
    const updated = await this.historyModel.findByIdAndUpdate(
      history._id,
      {
        $set: {
          activitySessionId: this.asOptionalString(aiResponse.activity_session_id) || history.activitySessionId,
          stay: this.mapStay(aiResponse.stay) || history.stay,
          tourPlan,
          totalCostEstimate: this.asOptionalNumber(aiResponse.total_cost_estimate),
          packingTips: this.asOptionalString(aiResponse.packing_tips),
          travelTips: this.asOptionalString(aiResponse.travel_tips),
          source: this.asOptionalString(aiResponse.source),
          tourPlanResponse: aiResponse,
          aiAnalysisStatus: 'completed',
          recommendedJourney: this.buildRecommendedJourney(
            history.selectedCity || '',
            this.mapStay(aiResponse.stay) || history.stay,
            tourPlan,
          ),
        },
      },
      { new: true },
    );
    return { history: updated!, aiResponse };
  }

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
        .sort({ [sortBy]: sortOrder } as never),
    ]);

    return { meta: { page, limit, total }, data };
  }

  async getUserHistory(userId: string, options: IOptions) {
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const query = { user: userObjectId };

    const [total, data] = await Promise.all([
      this.historyModel.countDocuments(query),
      this.historyModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortOrder } as never),
    ]);

    return { meta: { page, limit, total }, data };
  }

  async getSingleHistory(id: string): Promise<HistoryDocument> {
    this.ensureValidObjectId(id, 'Invalid history ID');

    const history = await this.historyModel
      .findById(id)
      .populate('user', 'fullName email profilePicture role');

    if (!history) {
      throw new HttpException('History not found', 404);
    }

    return history;
  }

  async updateHistory(id: string, updateHistoryDto: UpdateHistoryDto): Promise<HistoryDocument> {
    this.ensureValidObjectId(id, 'Invalid history ID');

    const history = await this.historyModel.findById(id);
    if (!history) {
      throw new HttpException('History not found', 404);
    }

    if (updateHistoryDto.paymentStatus === 'paid' && history.paymentStatus !== 'paid') {
      (updateHistoryDto as UpdateHistoryDto & { paidAt?: Date }).paidAt = new Date();
    }

    const updated = await this.historyModel.findByIdAndUpdate(
      id,
      { $set: updateHistoryDto },
      { new: true },
    );

    return updated!;
  }

  async deleteHistory(id: string): Promise<HistoryDocument> {
    this.ensureValidObjectId(id, 'Invalid history ID');

    const history = await this.historyModel.findById(id);
    if (!history) {
      throw new HttpException('History not found', 404);
    }

    return this.historyModel.findByIdAndDelete(id) as Promise<HistoryDocument>;
  }

  async deleteMyHistory(id: string, userId: string): Promise<HistoryDocument> {
    this.ensureValidObjectId(id, 'Invalid history ID');

    const history = await this.historyModel.findOne({
      _id: id,
      user: this.toObjectId(userId, 'Invalid user ID'),
    });
    if (!history) {
      throw new HttpException('History not found', 404);
    }

    return this.historyModel.findByIdAndDelete(id) as Promise<HistoryDocument>;
  }

  async getMyHistory(userId: string, options: IOptions) {
    return this.getUserHistory(userId, options);
  }

  async getMyHistoryByPaymentIntent(paymentIntentId: string, userId: string) {
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');
    const payment = await this.paymentModel.findOne({
      user: userObjectId,
      stripePaymentIntentId: paymentIntentId,
    });

    if (!payment) {
      throw new HttpException('Payment not found for the authenticated user', 404);
    }

    const history = await this.historyModel.findOne({
      user: userObjectId,
      stripePaymentIntentId: paymentIntentId,
    });

    return {
      payment: {
        paymentId: payment.paymentId,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        status: payment.status,
        analysisStatus: payment.analysisStatus,
        analysisError: payment.analysisError,
      },
      history,
    };
  }

  async getMySingleHistory(historyId: string, userId: string): Promise<HistoryDocument> {
    this.ensureValidObjectId(historyId, 'Invalid history ID');

    const history = await this.historyModel.findOne({
      _id: historyId,
      user: this.toObjectId(userId, 'Invalid user ID'),
    });

    if (!history) {
      throw new HttpException('History not found', 404);
    }

    return history;
  }

  private async findPaidPayment(paymentIntentId: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: paymentIntentId,
    });

    if (!payment) {
      throw new HttpException('Payment not found for the provided payment intent', 404);
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new HttpException('Payment has not completed successfully yet', 400);
    }

    return payment;
  }

  private extractSuggestedCities(aiResponse: Record<string, any>): SuggestedCity[] {
    const candidates = Array.isArray(aiResponse?.suggested_cities)
      ? aiResponse.suggested_cities
      : Array.isArray(aiResponse?.response?.suggested_cities)
        ? aiResponse.response.suggested_cities
        : [];

    return candidates.map((item: SuggestedCityApiItem) => ({
      propertyId: this.asOptionalString(item.property_id),
      cityName: this.asOptionalString(item.city_name) || this.asOptionalString(item.property_name) || '',
      countryName: this.asOptionalString(item.country_name) || '',
      cityImage: this.asStringArray(item.city_image),
      latitude: this.asOptionalNumber(item.latitude) || 0,
      longitude: this.asOptionalNumber(item.longitude) || 0,
      numberOfDays: this.asOptionalNumber(item.number_of_days) || 0,
      description: this.asOptionalString(item.description) || '',
      matchScore: this.asOptionalNumber(item.match_score),
      matchReasons: this.asStringArray(item.match_reasons),
      warnings: [
        ...this.asStringArray(item.warnings),
        ...this.asStringArray(item.trade_offs),
      ],
      restrictionVerification: this.asOptionalString(item.restriction_verification),
      nightlyPrice: this.asOptionalString(item.nightly_price) ||
        (this.asOptionalNumber(item.nightly_price) !== undefined
          ? String(this.asOptionalNumber(item.nightly_price))
          : undefined),
      nightlyPriceIsLowerBound: Boolean(
        item.nightly_price_is_lower_bound ?? item.price_is_lower_bound,
      ),
      budgetTier: this.asOptionalString(item.budget_tier),
      packageType: this.asOptionalString(item.package_type) ||
        this.asOptionalString(item.package_or_a_la_carte),
      bestSeason: this.asOptionalString(item.best_season),
      settings: this.asStringArray(item.settings),
    }));
  }

  private mapStay(stay?: TourPlanApiResponse['stay']): StayDetails | undefined {
    if (!stay) {
      return undefined;
    }

    return {
      name: this.asOptionalString(stay.name) || '',
      address: this.asOptionalString(stay.address) || '',
      rating: this.asOptionalNumber(stay.rating),
      priceLevel: this.asOptionalString(stay.price_level),
      photos: this.asStringArray(stay.photos),
      coords: stay.coords,
    };
  }

  private mapTourPlan(days?: TourPlanDayApiItem[]): TourPlanDay[] {
    if (!Array.isArray(days)) {
      return [];
    }

    return days.map((day) => ({
      day: this.asOptionalNumber(day.day) || 0,
      activities: Array.isArray(day.activities)
        ? day.activities.map((activity) => ({
            activityName: this.asOptionalString(activity.activity_name) || '',
            activityDescription: this.asOptionalString(activity.activity_description) || '',
            activityLocation: this.asOptionalString(activity.activity_location) || '',
            activityAddress: this.asOptionalString(activity.activity_address) || '',
            activityImage: this.asStringArray(activity.activity_image),
            activityTime: this.asOptionalString(activity.activity_time) || '',
            activityCost: this.asOptionalNumber(activity.activity_cost) || 0,
            distanceFromPreviousKm: this.asOptionalNumber(
              activity.distance_from_previous_km,
            ),
          }))
        : [],
    }));
  }

  private buildRecommendedJourney(
    selectedCity: string,
    stay: StayDetails | undefined,
    tourPlan: TourPlanDay[],
  ): RecommendedJourney | undefined {
    if (!selectedCity) {
      return undefined;
    }

    return {
      destination: selectedCity,
      homeBase: stay?.name || selectedCity,
      homeBaseDescription: stay?.address || '',
      accommodationType: stay?.priceLevel,
      accommodationFeatures: stay?.photos?.length ? ['Photo gallery available'] : [],
      itinerary: tourPlan.map((day) => ({
        day: day.day,
        title: `Day ${day.day}`,
        description: day.activities
          .slice(0, 3)
          .map((activity) => activity.activityName)
          .filter(Boolean)
          .join(', '),
      })),
    };
  }

  /** Maps our saved questionnaire shape to the AI service's public v2 schema. */
  private buildAiRecommendationRequest(answers: Record<string, unknown>): Record<string, unknown> {
    const partyDetails = this.asRecord(answers.party_details);
    const partyType = this.asOptionalString(answers.travel_party) || 'solo';
    const adults = partyType === 'family'
      ? this.asOptionalNumber(partyDetails?.adults) || 1
      : partyType === 'small_group'
        ? this.asOptionalNumber(partyDetails?.party_size) || 2
        : partyType === 'couple' ? 2 : 1;
    const travelTiming = this.asOptionalString(answers.travel_timing) || 'flexible';

    return {
      schema_version: '2026-08-15.v2',
      archetype: answers.selected_archetype,
      escape_from: answers.break_from,
      arrival_priority: answers.arrival_priority,
      structure_preference: answers.retreat_structure,
      reset_style: answers.reset_style,
      physical_intensity: answers.physical_intensity,
      party: {
        type: partyType,
        adults,
        children: partyType === 'family'
          ? this.asOptionalNumber(partyDetails?.children) || 0
          : 0,
      },
      spirituality: answers.spirituality,
      travel_window: {
        mode: travelTiming,
        season: travelTiming === 'specific' ? 'choose_month' : null,
        months: travelTiming === 'specific' ? this.asNumberArray(answers.travel_months) : [],
      },
      planning_service_level: answers.planning_service,
      restrictions: answers.activity_restrictions,
      settings: this.asStringArray(answers.preferred_setting),
      budget: {
        currency: 'USD',
        per_person_per_night_max: answers.budget_per_night,
        open_ended: answers.budget_open_ended,
      },
      duration: {
        bucket: answers.trip_length,
        exact_nights: null,
      },
      transform_focus: this.asStringArray(answers.transform_focus),
    };
  }

  private buildUserProfile(dto: RequestSuggestedCitiesDto): UserProfile {
    const answers = dto.questions_answers || {};
    const archetypeProfile = this.asRecord(answers.archetype_profile);
    const tripLength = this.asOptionalString(answers.trip_length);
    const tripLengthDays = this.asOptionalNumber(answers.trip_length_days) || (
      tripLength === '1_3_nights' || tripLength === '1_3_days' ? 3 :
        tripLength === '4_7_nights' || tripLength === '4_7_days' ? 7 :
          tripLength === '1_2_weeks' ? 14 :
            tripLength === '2_plus_weeks' ? 21 : 0
    );
    const preferredEnvironments = this.asStringArray(answers.preferred_environments);
    const preferredSetting = this.asStringArray(answers.preferred_setting);

    return {
      wellnessArchetype: this.asOptionalString(answers.selected_archetype) || '',
      wellnessNeeds: this.asStringArray(archetypeProfile?.needs),
      zodiacSign: this.getZodiacSign(this.asOptionalString(answers.birthdate)),
      currentEnergy: this.asOptionalString(answers.energy_level) || this.asOptionalString(answers.physical_intensity) || '',
      emotionalState: this.asOptionalString(answers.todays_feeling) || this.asOptionalString(answers.break_from) || '',
      seeking:
        dto.hope_of_this_trip ||
        this.asOptionalString(answers.experience_kind) ||
        this.asStringArray(answers.transform_focus).join(', ') ||
        '',
      travelStyle: this.mapTravelStyle(
        this.asOptionalString(answers.travel_style) || this.asOptionalString(answers.travel_party),
      ),
      preferredPace: this.mapPreferredPace(
        this.asOptionalString(answers.trip_organization) || this.asOptionalString(answers.planning_service),
      ),
      budget: this.asOptionalNumber(answers.total_trip_budget) || this.asOptionalNumber(answers.budget_per_night) || 0,
      tripLengthDays,
      preferredEnvironments: preferredEnvironments.length ? preferredEnvironments : preferredSetting,
    };
  }

  private buildTravelThemes(dto: RequestSuggestedCitiesDto): string[] {
    const answers = dto.questions_answers || {};
    const archetypeProfile = this.asRecord(answers.archetype_profile);
    const themes = [
      this.asOptionalString(answers.selected_archetype),
      ...this.asStringArray(archetypeProfile?.needs),
      ...this.asStringArray(answers.preferred_environments),
      ...this.asStringArray(answers.preferred_setting),
      dto.preferred_destinations,
      dto.hope_of_this_trip,
      this.asOptionalString(answers.experience_kind),
      ...this.asStringArray(answers.transform_focus),
      this.asOptionalString(answers.life_season),
    ].filter((value): value is string => Boolean(value));

    return [...new Set(themes.map((value) => value.trim()))];
  }

  private mapTravelStyle(value?: string): string {
    const normalized = value?.toLowerCase() || '';

    if (normalized.includes('couple')) {
      return 'couple';
    }
    if (normalized.includes('family')) {
      return 'family';
    }
    if (normalized.includes('group')) {
      return 'group';
    }

    return 'solo';
  }

  private mapPreferredPace(value?: string): string {
    const normalized = value?.toLowerCase() || '';

    if (normalized.includes('loosely') || normalized.includes('balanced')) {
      return 'balanced';
    }
    if (normalized.includes('well')) {
      return 'well_planned';
    }

    return 'spontaneous';
  }

  private getZodiacSign(birthdate?: string): string {
    if (!birthdate) {
      return 'Unknown';
    }

    const date = new Date(birthdate);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }

    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
    return 'Pisces';
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.asOptionalString(item))
      .filter((item): item is string => Boolean(item));
  }

  private asNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.asOptionalNumber(item))
      .filter((item): item is number => item !== undefined);
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private asOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private asOptionalNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : typeof value === 'string' && value.trim() && Number.isFinite(Number(value))
        ? Number(value)
        : undefined;
  }

  private ensureValidObjectId(id: string, message: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(message, 400);
    }
  }

  private toObjectId(id: string, message: string): Types.ObjectId {
    this.ensureValidObjectId(id, message);
    return new Types.ObjectId(id);
  }
}
