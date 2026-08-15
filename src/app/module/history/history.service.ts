import {
  BadRequestException,
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
import { RequestRetreatRecommendationsDto } from './dto/retreat-v2.dto';
import { UpdateHistoryDto } from './dto/update.history.dto';
import {
  Coordinates,
  HistoryDocument,
  HistoryRecord,
  RecommendedJourney,
  StayDetails,
  SuggestedCity,
  RetreatRecommendation,
  RetreatScoreBreakdown,
  ExtractedRestrictions,
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
  city_name?: string;
  country_name?: string;
  city_image?: string[];
  latitude?: number;
  longitude?: number;
  number_of_days?: number;
  description?: string;
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

  async createHistory(
    createHistoryDto: CreateHistoryDto,
    userId: string,
  ): Promise<HistoryDocument> {
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');
    return this.historyModel.create({
      ...createHistoryDto,
      user: userObjectId,
    });
  }

  async generateSuggestedCities(
    dto: RequestSuggestedCitiesDto,
    userId: string,
  ): Promise<{
    history: HistoryDocument;
    aiResponse: Record<string, unknown>;
  }> {
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');
    const payment = await this.findPaidPayment(dto.payment_intent_id);
    const normalizedDto = {
      ...dto,
      questions_answers: normalizeQuestionnaireAnswers(dto.questions_answers),
    };
    const aiResponse = await this.historyAiClient.getSuggestedCities({
      questions_answers: normalizedDto.questions_answers,
      preferred_destinations: normalizedDto.preferred_destinations,
      hope_of_this_trip: normalizedDto.hope_of_this_trip,
    });

    const aiSessionId = this.asOptionalString(aiResponse?.session_id);
    if (!aiSessionId) {
      throw new InternalServerErrorException(
        'AI response is missing session_id',
      );
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

  async generateSuggestedCitiesFromPayment(payment: PaymentDocument): Promise<{
    history: HistoryDocument;
    aiResponse: Record<string, unknown>;
  }> {
    if (!payment.user) {
      throw new HttpException('Payment is missing user information', 400);
    }

    if (!payment.stripePaymentIntentId) {
      throw new HttpException(
        'Payment is missing Stripe payment intent id',
        400,
      );
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

  async generateRetreatRecommendationsFromPayment(
    payment: PaymentDocument,
  ): Promise<{
    history: HistoryDocument;
    aiResponse: Record<string, unknown>;
  }> {
    if (!payment.user || !payment.stripePaymentIntentId) {
      throw new HttpException(
        'Payment is missing user or payment intent information',
        400,
      );
    }

    const questionnaire = payment.analysisRequest?.questionnaire;
    if (!questionnaire) {
      throw new HttpException(
        'Payment is missing the v2 retreat questionnaire',
        400,
      );
    }

    const recommendationPayload =
      this.buildRetreatRecommendationPayload(questionnaire);
    const aiResponse = (await this.historyAiClient.getRetreatRecommendations(
      recommendationPayload,
    )) as Record<string, unknown>;
    const recommendationSessionId = this.asOptionalString(
      aiResponse.recommendation_session_id,
    );

    if (!recommendationSessionId) {
      throw new InternalServerErrorException(
        'Retreat recommendation response is missing recommendation_session_id',
      );
    }

    const recommendations = this.extractRetreatRecommendations(aiResponse);
    const historyData = {
      user: payment.user,
      userProfile: this.buildV2UserProfile(recommendationPayload),
      questionnaireAnswers: recommendationPayload,
      travelThemes: this.asStringArray(recommendationPayload.transform_focus),
      recommendationSessionId,
      schemaVersion: this.asOptionalString(aiResponse.schema_version),
      scoringVersion: this.asOptionalString(aiResponse.scoring_version),
      answerMappingVersion: this.asOptionalString(
        aiResponse.answer_mapping_version,
      ),
      databaseVersion: this.asOptionalString(aiResponse.database_version),
      retreatRecommendations: recommendations,
      excludedCount: this.asOptionalNumber(aiResponse.excluded_count),
      totalCandidateCount: this.asOptionalNumber(
        aiResponse.total_candidate_count,
      ),
      extractedRestrictions: this.mapExtractedRestrictions(
        aiResponse.extracted_restrictions,
      ),
      dataGaps: this.asStringArray(aiResponse.data_gaps),
      suggestedCityResponse: aiResponse,
      aiAnalysisStatus: 'suggested_cities_ready',
      paymentAmount: payment.amount,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      paymentStatus: 'paid',
      paidAt: payment.updatedAt ?? payment.createdAt,
    };

    const existingHistory = await this.historyModel.findOne({
      user: payment.user,
      stripePaymentIntentId: payment.stripePaymentIntentId,
    });
    const history = existingHistory
      ? await this.historyModel.findByIdAndUpdate(
          existingHistory._id,
          { $set: historyData },
          { new: true },
        )
      : await this.historyModel.create(historyData);

    return { history: history!, aiResponse };
  }

  async generateRetreatRecommendations(
    dto: RequestRetreatRecommendationsDto,
    userId: string,
  ): Promise<{
    history: HistoryDocument;
    aiResponse: Record<string, unknown>;
  }> {
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');
    const payment = await this.paymentModel.findOne({
      user: userObjectId,
      stripePaymentIntentId: dto.payment_intent_id,
    });

    if (!payment) {
      throw new HttpException(
        'Payment not found for the authenticated user',
        404,
      );
    }
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new HttpException(
        'Payment has not completed successfully yet',
        400,
      );
    }

    payment.questionnaireVersion = 'v2';
    const { payment_intent_id: _paymentIntentId, ...questionnaire } = dto;
    payment.analysisRequest = {
      ...(payment.analysisRequest || {}),
      version: 'v2',
      questionnaire: questionnaire as unknown as Record<string, unknown>,
    };
    await payment.save();

    return this.generateRetreatRecommendationsFromPayment(payment);
  }

  async generateTourPlan(
    dto: RequestTourPlanDto,
    userId: string,
  ): Promise<{
    history: HistoryDocument;
    aiResponse: Record<string, unknown>;
  }> {
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');

    const history = await this.historyModel.findOne({
      user: userObjectId,
      $or: [
        { aiSessionId: dto.session_id },
        { recommendationSessionId: dto.session_id },
      ],
    });

    if (!history) {
      throw new HttpException('History session not found', 404);
    }

    const requestedCity = dto.selected_city.trim().toLocaleLowerCase();
    const selectedProperty = dto.property_id
      ? history.retreatRecommendations?.find(
          (item) => item.propertyId === dto.property_id,
        )
      : undefined;

    if (dto.property_id && !selectedProperty) {
      throw new HttpException(
        'Selected retreat property was not found in this recommendation session',
        400,
      );
    }

    const selectedPropertyName = selectedProperty?.propertyName;
    const storedCity = history.selectedCity?.trim().toLocaleLowerCase();
    if (
      ((dto.property_id && history.selectedPropertyId === dto.property_id) ||
        (!dto.property_id && storedCity === requestedCity)) &&
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

    const aiResponse = (await this.historyAiClient.getTourPlan({
      ...dto,
      selected_city: selectedPropertyName || dto.selected_city,
    })) as TourPlanApiResponse & Record<string, unknown>;

    const stay = this.mapStay(aiResponse.stay);
    const tourPlan = this.mapTourPlan(aiResponse.tour_plan);
    const updated = await this.historyModel.findByIdAndUpdate(
      history._id,
      {
        $set: {
          activitySessionId: this.asOptionalString(
            aiResponse.activity_session_id,
          ),
          selectedCity: dto.selected_city,
          selectedPropertyId: dto.property_id,
          stay,
          tourPlan,
          totalCostEstimate: this.asOptionalNumber(
            aiResponse.total_cost_estimate,
          ),
          packingTips: this.asOptionalString(aiResponse.packing_tips),
          travelTips: this.asOptionalString(aiResponse.travel_tips),
          source: this.asOptionalString(aiResponse.source),
          tourPlanResponse: aiResponse,
          aiAnalysisStatus: 'completed',
          recommendedJourney: this.buildRecommendedJourney(
            dto.selected_city,
            stay,
            tourPlan,
          ),
        },
      },
      { new: true },
    );

    return {
      history: updated!,
      aiResponse,
    };
  }

  async getAllHistory(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      historySearchableFields,
    );

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

  async updateHistory(
    id: string,
    updateHistoryDto: UpdateHistoryDto,
  ): Promise<HistoryDocument> {
    this.ensureValidObjectId(id, 'Invalid history ID');

    const history = await this.historyModel.findById(id);
    if (!history) {
      throw new HttpException('History not found', 404);
    }

    if (
      updateHistoryDto.paymentStatus === 'paid' &&
      history.paymentStatus !== 'paid'
    ) {
      (updateHistoryDto as UpdateHistoryDto & { paidAt?: Date }).paidAt =
        new Date();
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
      throw new HttpException(
        'Payment not found for the authenticated user',
        404,
      );
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

  async getMySingleHistory(
    historyId: string,
    userId: string,
  ): Promise<HistoryDocument> {
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

  private async findPaidPayment(
    paymentIntentId: string,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: paymentIntentId,
    });

    if (!payment) {
      throw new HttpException(
        'Payment not found for the provided payment intent',
        404,
      );
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new HttpException(
        'Payment has not completed successfully yet',
        400,
      );
    }

    return payment;
  }

  private extractSuggestedCities(
    aiResponse: Record<string, any>,
  ): SuggestedCity[] {
    const candidates = Array.isArray(aiResponse?.suggested_cities)
      ? aiResponse.suggested_cities
      : Array.isArray(aiResponse?.response?.suggested_cities)
        ? aiResponse.response.suggested_cities
        : [];

    return candidates.map((item: SuggestedCityApiItem) => ({
      cityName: this.asOptionalString(item.city_name) || '',
      countryName: this.asOptionalString(item.country_name) || '',
      cityImage: this.asStringArray(item.city_image),
      latitude: this.asOptionalNumber(item.latitude) || 0,
      longitude: this.asOptionalNumber(item.longitude) || 0,
      numberOfDays: this.asOptionalNumber(item.number_of_days) || 0,
      description: this.asOptionalString(item.description) || '',
    }));
  }

  private extractRetreatRecommendations(
    aiResponse: Record<string, unknown>,
  ): RetreatRecommendation[] {
    const candidates = Array.isArray(aiResponse.recommendations)
      ? aiResponse.recommendations
      : [];

    return candidates.map((item) => {
      const value = this.asRecord(item) || {};
      return {
        propertyId: this.asOptionalString(value.property_id) || '',
        propertyName: this.asOptionalString(value.property_name) || '',
        country: this.asOptionalString(value.country) || '',
        region: this.asOptionalString(value.region) || '',
        settings: this.asStringArray(value.settings),
        matchScore: this.asOptionalNumber(value.match_score) || 0,
        scoreBreakdown: (value.score_breakdown || {}) as RetreatScoreBreakdown,
        matchReasons: this.asStringArray(value.match_reasons),
        warnings: this.asStringArray(value.warnings),
        restrictionStatus:
          this.asOptionalString(value.restriction_status) || 'unverified',
        avgNight: this.asOptionalNumber(value.avg_night),
        avgNightIsLowerBound: value.avg_night_is_lower_bound === true,
        avgNightRaw: this.asOptionalString(value.avg_night_raw),
        budgetTier: this.asOptionalString(value.budget_tier),
        programCost: this.asOptionalString(value.program_cost),
        bestSeason: this.asNumberArray(value.best_season),
        bestSeasonRaw: this.asOptionalString(value.best_season_raw),
      };
    });
  }

  private buildRetreatRecommendationPayload(
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    const allowedFocus = new Set([
      'Burnout Recovery',
      'Longevity',
      'Detox',
      'Weight Loss',
      'Spiritual Growth',
      'Emotional Healing',
      'Nervous System Reset',
      'Fitness',
      'Creativity',
      'Relationship Repair',
      'Community',
      'Sleep',
      'Digital Detox',
      'Cultural Immersion',
    ]);
    const allowedSettings = new Set([
      'mountains',
      'ocean_beach',
      'jungle_rainforest',
      'desert',
      'countryside_farmland',
      'lake',
      'city_urban',
    ]);
    const transformFocus = this.asStringArray(input.transform_focus).filter(
      (value) => value !== 'string' && allowedFocus.has(value),
    );
    if (!transformFocus.length || transformFocus.length > 3) {
      throw new BadRequestException(
        'v2 transform_focus must contain 1 to 3 canonical values',
      );
    }

    const travelWindow = this.asRecord(input.travel_window);
    if (!travelWindow) {
      throw new BadRequestException('v2 travel_window is required');
    }
    const travelMode = this.asOptionalString(travelWindow.mode);
    if (travelMode === 'flexible') {
      // Flexible timing must not carry season/month fields to the AI API.
      input = { ...input, travel_window: { mode: 'flexible' } };
    } else if (travelMode === 'specific') {
      const season = this.asOptionalString(travelWindow.season);
      if (!season) {
        throw new BadRequestException(
          'specific travel_window requires a season',
        );
      }
      const months = this.asNumberArray(travelWindow.months);
      if (season === 'choose_month') {
        if (!months.length || months.some((month) => month < 1 || month > 12)) {
          throw new BadRequestException(
            'choose_month travel_window requires months between 1 and 12',
          );
        }
        input = {
          ...input,
          travel_window: { mode: 'specific', season, months },
        };
      } else {
        input = { ...input, travel_window: { mode: 'specific', season } };
      }
    } else {
      throw new BadRequestException(
        'v2 travel_window.mode must be flexible or specific',
      );
    }

    const party = this.asRecord(input.party);
    const budget = this.asRecord(input.budget);
    const duration = this.asRecord(input.duration);
    const restrictions = this.asRecord(input.restrictions) || {};
    const settings = this.asStringArray(input.settings).filter((value) =>
      allowedSettings.has(value),
    );
    const budgetAmount = this.asOptionalNumber(
      budget?.per_person_per_night_max,
    );
    if (!budgetAmount || budgetAmount <= 0) {
      throw new BadRequestException(
        'v2 budget.per_person_per_night_max must be greater than zero',
      );
    }

    return {
      archetype: input.archetype,
      escape_from: input.escape_from,
      arrival_priority: input.arrival_priority,
      structure_preference: input.structure_preference,
      reset_style: input.reset_style,
      physical_intensity: input.physical_intensity,
      party,
      spirituality: input.spirituality,
      travel_window: input.travel_window,
      planning_service_level: input.planning_service_level,
      restrictions: {
        text: this.asOptionalString(restrictions.text) || '',
        codes: this.asStringArray(restrictions.codes).filter(
          (code) => code !== 'string',
        ),
      },
      settings,
      budget: {
        currency: this.asOptionalString(budget?.currency) || 'USD',
        per_person_per_night_max: budgetAmount,
        open_ended: budget?.open_ended === true,
      },
      duration,
      transform_focus: [...new Set(transformFocus)],
    };
  }

  private mapExtractedRestrictions(
    value: unknown,
  ): ExtractedRestrictions | undefined {
    const record = this.asRecord(value);
    if (!record) return undefined;
    return {
      codes: this.asStringArray(record.codes),
      accessibilityNeeds: this.asStringArray(record.accessibility_needs),
      unresolvedText: this.asStringArray(record.unresolved_text),
    };
  }

  private buildV2UserProfile(
    questionnaire: Record<string, unknown>,
  ): UserProfile {
    const party = this.asRecord(questionnaire.party);
    const budget = this.asRecord(questionnaire.budget);
    const duration = this.asRecord(questionnaire.duration);
    return {
      wellnessArchetype: this.asOptionalString(questionnaire.archetype) || '',
      wellnessNeeds: this.asStringArray(questionnaire.transform_focus),
      zodiacSign: 'Unknown',
      currentEnergy: '',
      emotionalState: this.asOptionalString(questionnaire.escape_from) || '',
      seeking: this.asOptionalString(questionnaire.reset_style) || '',
      travelStyle: this.asOptionalString(party?.type) || '',
      preferredPace:
        this.asOptionalString(questionnaire.planning_service_level) || '',
      budget: this.asOptionalNumber(budget?.per_person_per_night_max) || 0,
      tripLengthDays: this.asOptionalNumber(duration?.exact_nights) || 0,
      preferredEnvironments: this.asStringArray(questionnaire.settings),
    };
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
            activityDescription:
              this.asOptionalString(activity.activity_description) || '',
            activityLocation:
              this.asOptionalString(activity.activity_location) || '',
            activityAddress:
              this.asOptionalString(activity.activity_address) || '',
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
      accommodationFeatures: stay?.photos?.length
        ? ['Photo gallery available']
        : [],
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

  private buildUserProfile(dto: RequestSuggestedCitiesDto): UserProfile {
    const answers = dto.questions_answers || {};
    const archetypeProfile = this.asRecord(answers.archetype_profile);

    return {
      wellnessArchetype:
        this.asOptionalString(answers.selected_archetype) || '',
      wellnessNeeds: this.asStringArray(archetypeProfile?.needs),
      zodiacSign: this.getZodiacSign(this.asOptionalString(answers.birthdate)),
      currentEnergy: this.asOptionalString(answers.energy_level) || '',
      emotionalState: this.asOptionalString(answers.todays_feeling) || '',
      seeking:
        dto.hope_of_this_trip ||
        this.asOptionalString(answers.experience_kind) ||
        '',
      travelStyle: this.mapTravelStyle(
        this.asOptionalString(answers.travel_style),
      ),
      preferredPace: this.mapPreferredPace(
        this.asOptionalString(answers.trip_organization),
      ),
      budget: this.asOptionalNumber(answers.total_trip_budget) || 0,
      tripLengthDays: this.asOptionalNumber(answers.trip_length_days) || 0,
      preferredEnvironments: this.asStringArray(answers.preferred_environments),
    };
  }

  private buildTravelThemes(dto: RequestSuggestedCitiesDto): string[] {
    const answers = dto.questions_answers || {};
    const archetypeProfile = this.asRecord(answers.archetype_profile);
    const themes = [
      this.asOptionalString(answers.selected_archetype),
      ...this.asStringArray(archetypeProfile?.needs),
      ...this.asStringArray(answers.preferred_environments),
      dto.preferred_destinations,
      dto.hope_of_this_trip,
      this.asOptionalString(answers.experience_kind),
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

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
      return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
      return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
      return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
      return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
      return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
      return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
      return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
      return 'Sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
      return 'Capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
      return 'Aquarius';
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
      : typeof value === 'string' &&
          value.trim() &&
          Number.isFinite(Number(value))
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
