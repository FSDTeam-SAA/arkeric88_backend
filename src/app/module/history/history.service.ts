import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
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
  BudgetCheck,
  Coordinates,
  FeelingBlock,
  HistoryDocument,
  HistoryRecord,
  RecommendedJourney,
  StayDetails,
  SuggestedCity,
  TourPlanDay,
  UserProfile,
} from './entity/history.entity';
import { HistoryAiClient } from './history-ai.client';
import {
  ACTIVITY_RESTRICTIONS,
  isVelariIntake,
  VelariIntakeDto,
} from './dto/velari-intake.dto';

const historySearchableFields = [
  'aiAnalysisStatus',
  'paymentStatus',
  'userProfile.zodiacSign',
  'recommendedJourney.destination',
  'aiSessionId',
  'selectedCity',
];

type SuggestedCityApiItem = {
  destination_id?: string;
  city_name?: string;
  country_name?: string;
  world_region?: string;
  city_image?: string[];
  latitude?: number | null;
  longitude?: number | null;
  number_of_days?: number;
  description?: string;
  match_score?: number;
  score_breakdown?: Record<string, unknown>;
  match_reasons?: string[];
  tradeoffs?: string[];
  unresolved_facts?: string[];
  warnings?: string[];
  restriction_checks?: Record<string, unknown>[];
  distance_check?: Record<string, unknown>;
  verification?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
};

type SuggestionResponseDetails = {
  match_status?: string;
  suggested_cities?: SuggestedCityApiItem[];
  no_valid_result?: Record<string, unknown> | null;
  clarifications?: Record<string, unknown>[];
  guest_context?: Record<string, unknown>;
  eligible_count?: number;
  excluded_count?: number;
  excluded_by_reason?: Record<string, unknown>;
  total_candidate_count?: number;
  data_gaps?: string[];
  origin?: Record<string, unknown>;
  estimate_status?: string;
  generated_at_utc?: string;
  intake_form?: unknown;
  catalog_version?: string;
  intake_mapping_version?: string;
  scoring_version?: string;
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
  place_id?: string | null;
  business_status?: string | null;
  availability_note?: string;
};

type TourPlanDayApiItem = {
  day?: number;
  activities?: TourActivityApiItem[];
};

type TourPlanApiResponse = {
  activity_session_id?: string;
  destination_id?: string;
  city?: string;
  feeling_block?: {
    title?: string;
    feelings?: Record<string, unknown>[];
    headline?: string;
    intention?: string;
    narrative?: string | null;
    markdown?: string;
    supporting_experiences?: Record<string, unknown>[];
    note?: string;
    alignment?: Record<string, unknown>;
  };
  stay?: {
    name?: string;
    address?: string;
    rating?: number;
    price_level?: string;
    photos?: string[];
    coords?: Coordinates;
    average_nightly_price?: number;
    budget_tier?: string;
    facilities?: string[];
    website?: string;
    estimate_note?: string;
    price_status?: string;
    availability_status?: string;
  };
  tour_plan?: TourPlanDayApiItem[];
  total_cost_estimate?: number;
  budget_check?: {
    budget_per_night_usd?: number;
    budget_open_ended?: boolean;
    rooms?: number;
    estimated_stay_nightly_usd?: number | null;
    stay_within_budget?: boolean | null;
    status?: string;
    note?: string;
  };
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
    if (!dto.intake) {
      throw new UnprocessableEntityException(
        'The legacy questions_answers payload is no longer supported; send intake',
      );
    }
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');
    const payment = await this.findPaidPayment(dto.payment_intent_id);
    const intake = { ...dto.intake };
    const aiResponse = await this.historyAiClient.getSuggestedCities(intake);

    const aiSessionId = this.asOptionalString(aiResponse?.session_id);
    if (!aiSessionId) {
      throw new InternalServerErrorException(
        'AI response is missing session_id',
      );
    }

    const responseDetails = this.extractSuggestionResponseDetails(aiResponse);
    const matchStatus = this.extractMatchStatus(aiResponse, responseDetails);
    const suggestedCities = this.extractSuggestedCities(aiResponse);

    this.validateSuggestionResult(
      matchStatus,
      suggestedCities,
      responseDetails,
      dto.intake,
    );

    const historyData = {
      user: userObjectId,
      userProfile: this.buildUserProfile(dto),
      intake,
      preferredDestinations: dto.preferred_destinations,
      hopeOfThisTrip: dto.hope_of_this_trip,
      travelThemes: this.buildTravelThemes(dto),
      aiSessionId,
      suggestedCities,
      matchStatus,
      ...(responseDetails.no_valid_result
        ? { noValidResult: responseDetails.no_valid_result }
        : {}),
      clarifications: this.asRecordArray(responseDetails.clarifications),
      guestContext: this.asRecord(responseDetails.guest_context),
      eligibleCount: this.asOptionalNumber(responseDetails.eligible_count),
      excludedCount: this.asOptionalNumber(responseDetails.excluded_count),
      excludedByReason: this.asRecord(responseDetails.excluded_by_reason),
      totalCandidateCount: this.asOptionalNumber(
        responseDetails.total_candidate_count,
      ),
      dataGaps: this.asStringArray(responseDetails.data_gaps),
      origin: this.asRecord(responseDetails.origin),
      estimateStatus: this.asOptionalString(responseDetails.estimate_status),
      generatedAtUtc: this.asOptionalString(responseDetails.generated_at_utc),
      intakeForm: responseDetails.intake_form,
      catalogVersion: this.asOptionalString(responseDetails.catalog_version),
      intakeMappingVersion: this.asOptionalString(
        responseDetails.intake_mapping_version,
      ),
      scoringVersion: this.asOptionalString(responseDetails.scoring_version),
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
          {
            $set: historyData,
            $unset: {
              questionnaireAnswers: 1,
              selectedCity: 1,
              selectedPropertyId: 1,
              activitySessionId: 1,
              stay: 1,
              tourPlan: 1,
              totalCostEstimate: 1,
              packingTips: 1,
              travelTips: 1,
              tourPlanResponse: 1,
              recommendedJourney: 1,
              ...(matchStatus === 'matched' ? { noValidResult: 1 } : {}),
            },
          },
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
    if (!analysisRequest) {
      throw new HttpException('Payment is missing questionnaire data', 400);
    }
    if (!analysisRequest.intake || !isVelariIntake(analysisRequest.intake)) {
      throw new UnprocessableEntityException(
        'This payment contains a legacy questionnaire and cannot be submitted to the Velari API',
      );
    }

    return this.generateSuggestedCities(
      {
        intake: analysisRequest.intake,
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
  ): Promise<{
    history: HistoryDocument;
    aiResponse: Record<string, unknown>;
  }> {
    const userObjectId = this.toObjectId(userId, 'Invalid user ID');

    const history = await this.historyModel.findOne({
      user: userObjectId,
      aiSessionId: dto.session_id,
    });

    if (!history) {
      throw new HttpException('History session not found', 404);
    }

    const selectedDestination = history.suggestedCities.find(
      (suggestion) => suggestion.destinationId === dto.destination_id,
    );
    if (!selectedDestination) {
      throw new HttpException(
        'Selected destination does not belong to this journey session',
        400,
      );
    }

    if (
      history.selectedDestinationId === dto.destination_id &&
      history.tourPlan?.length
    ) {
      return {
        history,
        aiResponse: history.tourPlanResponse ?? {
          source: 'database-cache',
          destination_id: dto.destination_id,
          city: history.selectedCity,
          feeling_block: history.feelingBlock,
          budget_check: history.budgetCheck,
          tour_plan: history.tourPlan,
        },
      };
    }

    let aiResponse: TourPlanApiResponse & Record<string, unknown>;

    try {
      aiResponse = (await this.historyAiClient.getTourPlan({
        session_id: history.aiSessionId || dto.session_id,
        destination_id: dto.destination_id,
      })) as TourPlanApiResponse & Record<string, unknown>;
    } catch (error) {
      if (
        this.isMissingAiSessionError(error) &&
        history.intake &&
        isVelariIntake(history.intake)
      ) {
        const freshAiRes = (await this.historyAiClient.getSuggestedCities(
          history.intake,
        )) as Record<string, unknown>;
        const newSessionId = this.asOptionalString(freshAiRes?.session_id);
        const refreshedDetails =
          this.extractSuggestionResponseDetails(freshAiRes);
        const refreshedMatchStatus = this.extractMatchStatus(
          freshAiRes,
          refreshedDetails,
        );
        const refreshedCities = this.extractSuggestedCities(freshAiRes);
        this.validateSuggestionResult(
          refreshedMatchStatus,
          refreshedCities,
          refreshedDetails,
          history.intake,
        );
        const destinationStillSuggested = refreshedCities.some(
          (city) => city.destinationId === dto.destination_id,
        );

        if (newSessionId && destinationStillSuggested) {
          history.aiSessionId = newSessionId;
          await this.historyModel.findByIdAndUpdate(history._id, {
            $set: {
              aiSessionId: newSessionId,
              suggestedCities: refreshedCities,
              matchStatus: refreshedMatchStatus,
              ...(refreshedDetails.no_valid_result
                ? { noValidResult: refreshedDetails.no_valid_result }
                : {}),
              clarifications: this.asRecordArray(
                refreshedDetails.clarifications,
              ),
              guestContext: this.asRecord(refreshedDetails.guest_context),
              eligibleCount: this.asOptionalNumber(
                refreshedDetails.eligible_count,
              ),
              excludedCount: this.asOptionalNumber(
                refreshedDetails.excluded_count,
              ),
              excludedByReason: this.asRecord(
                refreshedDetails.excluded_by_reason,
              ),
              totalCandidateCount: this.asOptionalNumber(
                refreshedDetails.total_candidate_count,
              ),
              dataGaps: this.asStringArray(refreshedDetails.data_gaps),
              origin: this.asRecord(refreshedDetails.origin),
              estimateStatus: this.asOptionalString(
                refreshedDetails.estimate_status,
              ),
              generatedAtUtc: this.asOptionalString(
                refreshedDetails.generated_at_utc,
              ),
              intakeForm: refreshedDetails.intake_form,
              catalogVersion: this.asOptionalString(
                refreshedDetails.catalog_version,
              ),
              intakeMappingVersion: this.asOptionalString(
                refreshedDetails.intake_mapping_version,
              ),
              scoringVersion: this.asOptionalString(
                refreshedDetails.scoring_version,
              ),
              suggestedCityResponse: freshAiRes,
            },
            ...(refreshedMatchStatus === 'matched'
              ? { $unset: { noValidResult: 1 } }
              : {}),
          });

          aiResponse = (await this.historyAiClient.getTourPlan({
            session_id: newSessionId,
            destination_id: dto.destination_id,
          })) as TourPlanApiResponse & Record<string, unknown>;
        } else if (newSessionId) {
          throw new HttpException(
            'The destination is no longer suggested after restoring the AI session',
            409,
          );
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    const responseDestinationId = this.asOptionalString(
      aiResponse.destination_id,
    );
    if (responseDestinationId !== dto.destination_id) {
      throw new InternalServerErrorException(
        'AI tour-plan response destination_id does not match the request',
      );
    }
    const activitySessionId = this.asOptionalString(
      aiResponse.activity_session_id,
    );
    if (!activitySessionId) {
      throw new InternalServerErrorException(
        'AI tour-plan response is missing activity_session_id',
      );
    }

    const stay = this.mapStay(aiResponse.stay);
    const tourPlan = this.mapTourPlan(aiResponse.tour_plan);
    const feelingBlock = this.mapFeelingBlock(aiResponse.feeling_block);
    const budgetCheck = this.mapBudgetCheck(aiResponse.budget_check);
    if (!stay || !feelingBlock || !budgetCheck) {
      throw new InternalServerErrorException(
        'AI tour-plan response is missing stay, feeling_block or budget_check',
      );
    }
    const selectedCity =
      this.asOptionalString(aiResponse.city) || selectedDestination.cityName;
    const updated = await this.historyModel.findByIdAndUpdate(
      history._id,
      {
        $set: {
          activitySessionId,
          selectedCity,
          selectedDestinationId: dto.destination_id,
          stay,
          tourPlan,
          feelingBlock,
          budgetCheck,
          totalCostEstimate: this.asOptionalNumber(
            aiResponse.total_cost_estimate,
          ),
          packingTips: this.asOptionalString(aiResponse.packing_tips),
          travelTips: this.asOptionalString(aiResponse.travel_tips),
          source: this.asOptionalString(aiResponse.source),
          tourPlanResponse: aiResponse,
          aiAnalysisStatus: 'completed',
          recommendedJourney: this.buildRecommendedJourney(
            selectedCity,
            stay,
            tourPlan,
          ),
        },
        $unset: { selectedPropertyId: 1 },
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
  ): Promise<{
    history: HistoryDocument;
    aiResponse: Record<string, unknown>;
  }> {
    const history = await this.historyModel.findOne({
      user: this.toObjectId(userId, 'Invalid user ID'),
      aiSessionId: dto.session_id,
    });
    if (!history) {
      throw new HttpException('History session not found', 404);
    }

    if (!history.intake || !isVelariIntake(history.intake)) {
      throw new UnprocessableEntityException(
        'The saved session does not contain a valid Velari intake',
      );
    }

    const hasIntakeUpdates = Boolean(dto.intake_updates);
    const effectiveIntake = hasIntakeUpdates
      ? await this.mergeAndValidateIntake(history.intake, dto.intake_updates!)
      : (history.intake as VelariIntakeDto);
    const userInstruction = dto.user_instruction?.trim() || undefined;

    let aiResponse: Record<string, unknown>;
    let activeSessionId = dto.session_id;
    let recoveredSession = false;

    try {
      aiResponse = (await this.historyAiClient.regenerateSuggestedCities({
        session_id: dto.session_id,
        user_instruction: userInstruction,
        ...(hasIntakeUpdates
          ? {
              intake_updates: effectiveIntake as unknown as Record<
                string,
                unknown
              >,
            }
          : {}),
      })) as Record<string, unknown>;
    } catch (error) {
      if (!this.isMissingAiSessionError(error)) throw error;

      recoveredSession = true;
      if (hasIntakeUpdates) {
        aiResponse = (await this.historyAiClient.getSuggestedCities(
          effectiveIntake as unknown as Record<string, unknown>,
        )) as Record<string, unknown>;
        activeSessionId =
          this.asOptionalString(aiResponse.session_id) || activeSessionId;
      } else {
        const recovered = await this.recoverSuggestionRegeneration(
          effectiveIntake,
          history.suggestedCities || [],
          userInstruction,
        );
        aiResponse = recovered.aiResponse;
        activeSessionId = recovered.sessionId;
      }
    }

    activeSessionId =
      this.asOptionalString(aiResponse.session_id) || activeSessionId;
    const responseDetails = this.extractSuggestionResponseDetails(aiResponse);
    const matchStatus = this.extractMatchStatus(aiResponse, responseDetails);
    const freshCities = this.extractSuggestedCities(aiResponse);
    this.validateSuggestionResult(
      matchStatus,
      freshCities,
      responseDetails,
      effectiveIntake,
      recoveredSession && !hasIntakeUpdates,
    );

    const previousCities = history.suggestedCities || [];
    if (!hasIntakeUpdates && !recoveredSession) {
      const shownIds = new Set(
        previousCities.map((city) => city.destinationId),
      );
      if (freshCities.some((city) => shownIds.has(city.destinationId))) {
        throw new InternalServerErrorException(
          'AI regeneration repeated a destination that was already shown',
        );
      }
    }
    const storedCities =
      matchStatus === 'no_valid_result'
        ? []
        : hasIntakeUpdates
          ? freshCities
          : [...previousCities, ...freshCities];

    const updated = await this.historyModel.findByIdAndUpdate(
      history._id,
      {
        $set: {
          aiSessionId: activeSessionId,
          intake: effectiveIntake,
          suggestedCities: storedCities,
          matchStatus,
          ...(responseDetails.no_valid_result
            ? { noValidResult: responseDetails.no_valid_result }
            : {}),
          clarifications: this.asRecordArray(responseDetails.clarifications),
          guestContext: this.asRecord(responseDetails.guest_context),
          eligibleCount: this.asOptionalNumber(responseDetails.eligible_count),
          excludedCount: this.asOptionalNumber(responseDetails.excluded_count),
          excludedByReason: this.asRecord(responseDetails.excluded_by_reason),
          totalCandidateCount: this.asOptionalNumber(
            responseDetails.total_candidate_count,
          ),
          dataGaps: this.asStringArray(responseDetails.data_gaps),
          origin: this.asRecord(responseDetails.origin),
          estimateStatus: this.asOptionalString(
            responseDetails.estimate_status,
          ),
          generatedAtUtc: this.asOptionalString(
            responseDetails.generated_at_utc,
          ),
          intakeForm: responseDetails.intake_form,
          catalogVersion: this.asOptionalString(
            responseDetails.catalog_version,
          ),
          intakeMappingVersion: this.asOptionalString(
            responseDetails.intake_mapping_version,
          ),
          scoringVersion: this.asOptionalString(
            responseDetails.scoring_version,
          ),
          suggestedCityResponse: aiResponse,
          tourPlan: [],
          aiAnalysisStatus: 'suggested_cities_ready',
        },
        $unset: {
          selectedCity: 1,
          selectedPropertyId: 1,
          selectedDestinationId: 1,
          activitySessionId: 1,
          stay: 1,
          feelingBlock: 1,
          budgetCheck: 1,
          totalCostEstimate: 1,
          packingTips: 1,
          travelTips: 1,
          tourPlanResponse: 1,
          recommendedJourney: 1,
          ...(matchStatus === 'matched' ? { noValidResult: 1 } : {}),
        },
      },
      { new: true },
    );

    return { history: updated!, aiResponse };
  }

  async regenerateTourPlan(
    dto: RegenerateTourPlanDto,
    userId: string,
  ): Promise<{
    history: HistoryDocument;
    aiResponse: Record<string, unknown>;
  }> {
    const history = await this.historyModel.findOne({
      user: this.toObjectId(userId, 'Invalid user ID'),
      activitySessionId: dto.activity_session_id,
    });
    if (!history) {
      throw new HttpException('Activity session not found', 404);
    }

    const aiResponse = (await this.historyAiClient.regenerateTourPlan({
      ...dto,
      user_instruction:
        dto.user_instruction ||
        'Regenerate this itinerary with different activities.',
    })) as TourPlanApiResponse & Record<string, unknown>;
    const responseDestinationId = this.asOptionalString(
      aiResponse.destination_id,
    );
    if (
      history.selectedDestinationId &&
      responseDestinationId !== history.selectedDestinationId
    ) {
      throw new InternalServerErrorException(
        'Regenerated tour-plan destination_id does not match the saved itinerary',
      );
    }
    const tourPlan = this.mapTourPlan(aiResponse.tour_plan);
    const stay = this.mapStay(aiResponse.stay) || history.stay;
    const feelingBlock = this.mapFeelingBlock(aiResponse.feeling_block);
    const budgetCheck = this.mapBudgetCheck(aiResponse.budget_check);
    if (!feelingBlock || !budgetCheck) {
      throw new InternalServerErrorException(
        'Regenerated tour-plan response is missing feeling_block or budget_check',
      );
    }
    const updated = await this.historyModel.findByIdAndUpdate(
      history._id,
      {
        $set: {
          activitySessionId:
            this.asOptionalString(aiResponse.activity_session_id) ||
            history.activitySessionId,
          selectedDestinationId:
            responseDestinationId || history.selectedDestinationId,
          stay,
          tourPlan,
          feelingBlock,
          budgetCheck,
          totalCostEstimate: this.asOptionalNumber(
            aiResponse.total_cost_estimate,
          ),
          packingTips: this.asOptionalString(aiResponse.packing_tips),
          travelTips: this.asOptionalString(aiResponse.travel_tips),
          source: this.asOptionalString(aiResponse.source),
          tourPlanResponse: aiResponse,
          aiAnalysisStatus: 'completed',
          recommendedJourney: this.buildRecommendedJourney(
            history.selectedCity || '',
            stay,
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

  private async mergeAndValidateIntake(
    storedIntake: Record<string, unknown>,
    updates: Record<string, unknown>,
  ): Promise<VelariIntakeDto> {
    const merged: Record<string, unknown> = {
      ...storedIntake,
      ...updates,
    };

    const selectedRestrictions = Array.isArray(merged.activity_restrictions)
      ? new Set(
          merged.activity_restrictions.filter(
            (value): value is string => typeof value === 'string',
          ),
        )
      : new Set<string>();
    for (const restriction of ACTIVITY_RESTRICTIONS) {
      if (!selectedRestrictions.has(restriction)) {
        delete merged[`restriction_severity_${restriction}`];
      }
    }
    if (
      merged.restriction_severity &&
      typeof merged.restriction_severity === 'object' &&
      !Array.isArray(merged.restriction_severity)
    ) {
      merged.restriction_severity = Object.fromEntries(
        Object.entries(
          merged.restriction_severity as Record<string, unknown>,
        ).filter(
          ([key]) =>
            !ACTIVITY_RESTRICTIONS.includes(
              key as (typeof ACTIVITY_RESTRICTIONS)[number],
            ) || selectedRestrictions.has(key),
        ),
      );
    }

    const instance = plainToInstance(VelariIntakeDto, merged);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length) {
      throw new HttpException(
        {
          message: 'Invalid intake updates',
          detail: this.flattenValidationErrors(errors),
        },
        422,
      );
    }

    return instance;
  }

  private flattenValidationErrors(
    errors: ValidationError[],
    parent: Array<string | number> = ['body', 'intake_updates'],
  ): Array<{ loc: Array<string | number>; msg: string }> {
    return errors.flatMap((error) => {
      const property = error.property.startsWith('_')
        ? undefined
        : error.property;
      const path = property ? [...parent, property] : parent;
      const ownErrors = Object.values(error.constraints || {}).map(
        (message) => ({
          loc: path,
          msg: message,
        }),
      );
      return [
        ...ownErrors,
        ...this.flattenValidationErrors(error.children || [], path),
      ];
    });
  }

  private isMissingAiSessionError(error: unknown): boolean {
    if (!(error instanceof HttpException) || error.getStatus() !== 404) {
      return false;
    }
    const response = error.getResponse();
    const text =
      typeof response === 'string' ? response : JSON.stringify(response);
    const normalized = text.toLocaleLowerCase();
    return (
      normalized.includes('session') &&
      (normalized.includes('not found') ||
        normalized.includes('expired') ||
        normalized.includes('unknown'))
    );
  }

  private async recoverSuggestionRegeneration(
    intake: VelariIntakeDto,
    previouslyShown: SuggestedCity[],
    userInstruction?: string,
  ): Promise<{ aiResponse: Record<string, unknown>; sessionId: string }> {
    let aiResponse = (await this.historyAiClient.getSuggestedCities(
      intake as unknown as Record<string, unknown>,
    )) as Record<string, unknown>;
    const sessionId = this.asOptionalString(aiResponse.session_id);
    if (!sessionId) {
      throw new InternalServerErrorException(
        'AI recovery response is missing session_id',
      );
    }

    const shownIds = new Set(
      previouslyShown.map((city) => city.destinationId).filter(Boolean),
    );
    const maxPages = 25;

    for (let page = 0; page < maxPages; page += 1) {
      const status = this.extractMatchStatus(
        aiResponse,
        this.extractSuggestionResponseDetails(aiResponse),
      );
      if (status === 'no_valid_result') {
        return { aiResponse, sessionId };
      }

      const cities = this.extractSuggestedCities(aiResponse);
      const unseenIds = new Set(
        cities
          .filter((city) => !shownIds.has(city.destinationId))
          .map((city) => city.destinationId),
      );
      if (unseenIds.size) {
        return {
          aiResponse: this.filterSuggestionResponse(aiResponse, unseenIds),
          sessionId,
        };
      }

      aiResponse = (await this.historyAiClient.regenerateSuggestedCities({
        session_id: sessionId,
        user_instruction: userInstruction,
      })) as Record<string, unknown>;
    }

    throw new HttpException('No more destination options are available', 404);
  }

  private filterSuggestionResponse(
    aiResponse: Record<string, unknown>,
    destinationIds: Set<string>,
  ): Record<string, unknown> {
    const filterCities = (value: unknown): unknown[] =>
      Array.isArray(value)
        ? value.filter((item) => {
            const record = this.asRecord(item);
            return destinationIds.has(
              this.asOptionalString(record?.destination_id) || '',
            );
          })
        : [];
    const nestedResponse = this.asRecord(aiResponse.response);

    return {
      ...aiResponse,
      ...(Array.isArray(aiResponse.suggested_cities)
        ? { suggested_cities: filterCities(aiResponse.suggested_cities) }
        : {}),
      ...(nestedResponse
        ? {
            response: {
              ...nestedResponse,
              suggested_cities: filterCities(nestedResponse.suggested_cities),
            },
          }
        : {}),
    };
  }

  private validateSuggestionResult(
    matchStatus: 'matched' | 'no_valid_result',
    cities: SuggestedCity[],
    details: SuggestionResponseDetails,
    intake: VelariIntakeDto,
    allowPartialMatchedResult = false,
  ): void {
    const minimumCities = allowPartialMatchedResult ? 1 : 2;
    if (
      matchStatus === 'matched' &&
      (cities.length < minimumCities || cities.length > 3)
    ) {
      throw new InternalServerErrorException(
        `AI matched response must contain ${minimumCities === 1 ? 'one to three' : 'two or three'} suggested cities`,
      );
    }
    if (
      matchStatus === 'matched' &&
      new Set(cities.map((city) => city.countryName.toLocaleLowerCase()))
        .size !== cities.length
    ) {
      throw new InternalServerErrorException(
        'AI matched response contains duplicate destination countries',
      );
    }
    const expectedNights = this.getIntakeNights(intake);
    if (
      matchStatus === 'matched' &&
      cities.some((city) => city.numberOfDays !== expectedNights)
    ) {
      throw new InternalServerErrorException(
        'AI suggested city duration does not match the submitted intake',
      );
    }
    if (matchStatus === 'no_valid_result' && cities.length > 0) {
      throw new InternalServerErrorException(
        'AI response is no_valid_result but contains suggested cities',
      );
    }
    if (matchStatus === 'no_valid_result' && !details.no_valid_result) {
      throw new InternalServerErrorException(
        'AI no_valid_result response is missing blocking details',
      );
    }
  }

  private extractSuggestedCities(
    aiResponse: Record<string, any>,
  ): SuggestedCity[] {
    const candidates = Array.isArray(aiResponse?.suggested_cities)
      ? aiResponse.suggested_cities
      : Array.isArray(aiResponse?.response?.suggested_cities)
        ? aiResponse.response.suggested_cities
        : [];

    return candidates.map((item: SuggestedCityApiItem, index: number) => {
      const destinationId = this.asOptionalString(item.destination_id);
      if (!destinationId) {
        throw new InternalServerErrorException(
          `AI suggested city at index ${index} is missing destination_id`,
        );
      }

      const tradeoffs = this.asStringArray(item.tradeoffs);
      const warnings = this.asStringArray(item.warnings);

      return {
        destinationId,
        cityName: this.asOptionalString(item.city_name) || '',
        countryName: this.asOptionalString(item.country_name) || '',
        worldRegion: this.asOptionalString(item.world_region),
        cityImage: this.asStringArray(item.city_image),
        latitude: this.asNullableNumber(item.latitude),
        longitude: this.asNullableNumber(item.longitude),
        numberOfDays: this.asOptionalNumber(item.number_of_days) || 0,
        description: this.asOptionalString(item.description) || '',
        matchScore: this.asOptionalNumber(item.match_score),
        scoreBreakdown: this.asRecord(item.score_breakdown),
        matchReasons: this.asStringArray(item.match_reasons),
        tradeoffs,
        unresolvedFacts: this.asStringArray(item.unresolved_facts),
        warnings: warnings.length ? warnings : tradeoffs,
        restrictionChecks: this.asRecordArray(item.restriction_checks),
        distanceCheck: this.asRecord(item.distance_check),
        verification: this.asRecord(item.verification),
        evidence: this.asRecord(item.evidence),
      };
    });
  }

  private extractSuggestionResponseDetails(
    aiResponse: Record<string, unknown>,
  ): SuggestionResponseDetails {
    return (this.asRecord(aiResponse.response) ||
      aiResponse) as SuggestionResponseDetails;
  }

  private extractMatchStatus(
    aiResponse: Record<string, unknown>,
    details: SuggestionResponseDetails,
  ): 'matched' | 'no_valid_result' {
    const status =
      this.asOptionalString(aiResponse.match_status) || details.match_status;
    if (status !== 'matched' && status !== 'no_valid_result') {
      throw new InternalServerErrorException(
        'AI response has an invalid match_status',
      );
    }
    return status;
  }

  private mapStay(stay?: TourPlanApiResponse['stay']): StayDetails | undefined {
    if (!stay) {
      return undefined;
    }

    const priceStatus = this.asOptionalString(stay.price_status);
    const availabilityStatus = this.asOptionalString(stay.availability_status);
    if (!priceStatus || !availabilityStatus) {
      throw new InternalServerErrorException(
        'AI stay response is missing price or availability status',
      );
    }

    return {
      name: this.asOptionalString(stay.name) || '',
      address: this.asOptionalString(stay.address) || '',
      rating: this.asOptionalNumber(stay.rating),
      priceLevel: this.asOptionalString(stay.price_level),
      photos: this.asStringArray(stay.photos),
      coords: stay.coords,
      averageNightlyPrice: this.asOptionalNumber(stay.average_nightly_price),
      budgetTier: this.asOptionalString(stay.budget_tier),
      facilities: this.asStringArray(stay.facilities),
      website: this.asOptionalString(stay.website),
      estimateNote: this.asOptionalString(stay.estimate_note),
      priceStatus,
      availabilityStatus,
    };
  }

  private mapFeelingBlock(
    block?: TourPlanApiResponse['feeling_block'],
  ): FeelingBlock | undefined {
    if (!block) return undefined;

    const headline = this.asOptionalString(block.headline);
    const intention = this.asOptionalString(block.intention);
    const alignment = this.asRecord(block.alignment);
    const alignmentStatus = this.asOptionalString(alignment?.status);
    const feelings = this.asRecordArray(block.feelings);
    const supportingExperiences = this.asRecordArray(
      block.supporting_experiences,
    );
    const narrative =
      block.narrative === null ? null : this.asOptionalString(block.narrative);
    if (
      !headline ||
      !intention ||
      !alignmentStatus ||
      !['aligned', 'revised', 'mismatch', 'not_assessed'].includes(
        alignmentStatus,
      )
    ) {
      throw new InternalServerErrorException(
        'AI feeling_block is missing required alignment content',
      );
    }
    if (
      ['aligned', 'revised'].includes(alignmentStatus) &&
      (!narrative || supportingExperiences.length < 2)
    ) {
      throw new InternalServerErrorException(
        'Aligned feeling_block requires a narrative and two supporting experiences',
      );
    }
    if (alignmentStatus === 'mismatch' && narrative !== null) {
      throw new InternalServerErrorException(
        'Mismatched feeling_block must not contain a narrative',
      );
    }

    return {
      title: this.asOptionalString(block.title) || '',
      feelings,
      headline,
      intention,
      narrative,
      markdown: this.asOptionalString(block.markdown),
      supportingExperiences,
      note: this.asOptionalString(block.note),
      alignment,
    };
  }

  private mapBudgetCheck(
    budget?: TourPlanApiResponse['budget_check'],
  ): BudgetCheck | undefined {
    if (!budget) return undefined;

    const budgetPerNightUsd = this.asOptionalNumber(
      budget.budget_per_night_usd,
    );
    const rooms = this.asOptionalNumber(budget.rooms);
    const status = this.asOptionalString(budget.status);
    const note = this.asOptionalString(budget.note);
    if (
      budgetPerNightUsd === undefined ||
      rooms === undefined ||
      typeof budget.budget_open_ended !== 'boolean' ||
      !status ||
      !note
    ) {
      throw new InternalServerErrorException(
        'AI budget_check is missing required fields',
      );
    }

    return {
      budgetPerNightUsd,
      budgetOpenEnded: budget.budget_open_ended === true,
      rooms,
      estimatedStayNightlyUsd:
        budget.estimated_stay_nightly_usd === null
          ? null
          : this.asOptionalNumber(budget.estimated_stay_nightly_usd),
      stayWithinBudget:
        typeof budget.stay_within_budget === 'boolean'
          ? budget.stay_within_budget
          : budget.stay_within_budget === null
            ? null
            : undefined,
      status,
      note,
    };
  }

  private mapTourPlan(days?: TourPlanDayApiItem[]): TourPlanDay[] {
    if (!Array.isArray(days)) {
      return [];
    }

    return days.map((day) => ({
      day: this.asOptionalNumber(day.day) || 0,
      activities: Array.isArray(day.activities)
        ? day.activities.map((activity) => {
            const availabilityNote = this.asOptionalString(
              activity.availability_note,
            );
            if (!availabilityNote) {
              throw new InternalServerErrorException(
                'AI tour-plan activity is missing availability_note',
              );
            }

            return {
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
              placeId: this.asOptionalString(activity.place_id) || null,
              businessStatus: this.asOptionalString(activity.business_status),
              availabilityNote,
            };
          })
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
    const intake = dto.intake!;

    return {
      wellnessArchetype: 'velari',
      wellnessNeeds: [...intake.trip_goals],
      zodiacSign: '',
      currentEnergy: intake.recent_feelings.join(', '),
      emotionalState: intake.recent_feelings.join(', '),
      seeking: intake.trip_goals.join(', '),
      travelStyle: intake.travel_party,
      preferredPace: intake.trip_pace,
      budget: intake.budget_per_night,
      tripLengthDays: intake.trip_nights || 0,
      preferredEnvironments: [...intake.preferred_environments],
    };
  }

  private buildTravelThemes(dto: RequestSuggestedCitiesDto): string[] {
    const intake = dto.intake!;
    const themes = [
      ...intake.trip_goals,
      ...intake.preferred_moments,
      ...intake.preferred_environments,
    ];

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

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private asRecordArray(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  private asNullableNumber(value: unknown): number | null {
    return this.asOptionalNumber(value) ?? null;
  }

  private getIntakeNights(intake: RequestSuggestedCitiesDto['intake']): number {
    if (!intake) return 0;
    if (intake.trip_nights) return intake.trip_nights;
    if (!intake.check_in_date || !intake.check_out_date) return 0;

    const checkIn = Date.parse(`${intake.check_in_date}T00:00:00.000Z`);
    const checkOut = Date.parse(`${intake.check_out_date}T00:00:00.000Z`);
    return Math.round((checkOut - checkIn) / 86_400_000);
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
