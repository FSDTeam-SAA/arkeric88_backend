import 'reflect-metadata';
import { HttpException } from '@nestjs/common';
import { HistoryService } from './history.service';
import { PaymentStatus } from '../payment/entities/payment.entity';
import { VelariIntakeDto } from './dto/velari-intake.dto';

const userId = '507f1f77bcf86cd799439011';

function intake(): VelariIntakeDto {
  return {
    recent_feelings: ['stretched_thin'],
    trip_goals: ['reflection'],
    trip_prompt: 'need_a_break',
    preferred_moments: ['quiet_privacy'],
    preferred_environments: ['mountains'],
    trip_pace: 'one_highlight',
    travel_party: 'solo',
    activity_restrictions: [],
    departure_location: 'London',
    travel_distance: 'anywhere',
    travel_timing: 'flexible',
    trip_nights: 5,
    budget_per_night: 400,
  } as VelariIntakeDto;
}

function destination(id: string, city: string, country: string) {
  return {
    destination_id: id,
    city_name: city,
    country_name: country,
    world_region: 'Test region',
    number_of_days: 5,
    description: 'A matching destination',
    city_image: [],
    latitude: null,
    longitude: null,
    match_score: 90,
    score_breakdown: { goals: 20 },
    match_reasons: ['Matches reflection'],
    tradeoffs: ['Check seasonality'],
    unresolved_facts: ['Live price not checked'],
    restriction_checks: [],
    verification: { budget_status: 'UNKNOWN' },
    evidence: { source_url: 'https://example.com' },
  };
}

function setup(aiResponse: Record<string, unknown>) {
  const historyModel = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async (value) => value),
    findByIdAndUpdate: jest.fn(),
  };
  const paymentModel = {
    findOne: jest.fn().mockResolvedValue({
      status: PaymentStatus.SUCCEEDED,
      amount: 49,
      stripePaymentIntentId: 'pi_test',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };
  const aiClient = {
    getSuggestedCities: jest.fn().mockResolvedValue(aiResponse),
  };
  const service = new HistoryService(
    historyModel as never,
    paymentModel as never,
    aiClient as never,
  );
  return { service, historyModel, paymentModel, aiClient };
}

describe('HistoryService Velari suggestions', () => {
  it('sends intake directly and persists destination audit fields and versions', async () => {
    const aiResponse = {
      session_id: 'session-1',
      match_status: 'matched',
      suggested_cities: [
        destination('PT-AZO', 'Azores', 'Portugal'),
        destination('JP-KYO', 'Kyoto', 'Japan'),
      ],
      response: {
        match_status: 'matched',
        suggested_cities: [],
        clarifications: [
          {
            field: 'departure_location',
            blocking: false,
            question: 'Confirm?',
          },
        ],
        guest_context: { trip_goals: ['Reflection'] },
        eligible_count: 12,
        excluded_count: 60,
        excluded_by_reason: { budget: 10 },
        total_candidate_count: 72,
        data_gaps: ['No live prices'],
        origin: { status: 'GEOCODED' },
        estimate_status: 'ESTIMATED',
        generated_at_utc: '2026-09-28T10:00:00+00:00',
        catalog_version: 'catalog-1',
        intake_mapping_version: 'mapping-1',
        scoring_version: 'scoring-1',
      },
    };
    const { service, historyModel, aiClient } = setup(aiResponse);
    const submittedIntake = intake();

    const result = await service.generateSuggestedCities(
      { intake: submittedIntake, payment_intent_id: 'pi_test' },
      userId,
    );

    expect(aiClient.getSuggestedCities).toHaveBeenCalledWith(submittedIntake);
    expect(historyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        intake: submittedIntake,
        matchStatus: 'matched',
        catalogVersion: 'catalog-1',
        intakeMappingVersion: 'mapping-1',
        scoringVersion: 'scoring-1',
        suggestedCities: expect.arrayContaining([
          expect.objectContaining({
            destinationId: 'PT-AZO',
            latitude: null,
            tradeoffs: ['Check seasonality'],
            unresolvedFacts: ['Live price not checked'],
            verification: { budget_status: 'UNKNOWN' },
          }),
        ]),
      }),
    );
    expect(result.aiResponse).toBe(aiResponse);
  });

  it('stores no_valid_result as a successful suggestion-session outcome', async () => {
    const blocking = {
      blocking_constraints: [
        { field: 'restriction_severity_mobility_accessibility' },
      ],
      question: 'Could you tell us more?',
      relaxed_automatically: false,
    };
    const { service, historyModel } = setup({
      session_id: 'session-2',
      match_status: 'no_valid_result',
      suggested_cities: [],
      response: {
        match_status: 'no_valid_result',
        suggested_cities: [],
        no_valid_result: blocking,
      },
    });

    await expect(
      service.generateSuggestedCities(
        { intake: intake(), payment_intent_id: 'pi_test' },
        userId,
      ),
    ).resolves.toBeDefined();
    expect(historyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        matchStatus: 'no_valid_result',
        suggestedCities: [],
        noValidResult: blocking,
        aiAnalysisStatus: 'suggested_cities_ready',
      }),
    );
  });

  it('rejects the legacy questionnaire before accessing payment or AI services', async () => {
    const { service, paymentModel, aiClient } = setup({});

    await expect(
      service.generateSuggestedCities(
        { questions_answers: { old: true }, payment_intent_id: 'pi_test' },
        userId,
      ),
    ).rejects.toMatchObject<HttpException>({ status: 422 });
    expect(paymentModel.findOne).not.toHaveBeenCalled();
    expect(aiClient.getSuggestedCities).not.toHaveBeenCalled();
  });
});

function tourPlanResponse() {
  return {
    activity_session_id: 'activity-1',
    destination_id: 'PT-AZO',
    city: 'São Miguel, Azores',
    feeling_block: {
      title: 'The feeling behind your journey',
      feelings: [{ code: 'reflection', label: 'Reflective' }],
      headline: 'THE FEELING: REFLECTIVE',
      intention: 'You want quiet time to reflect.',
      narrative: 'A ridge walk and an art visit create space for reflection.',
      markdown: '**THE FEELING: REFLECTIVE**',
      supporting_experiences: [
        { day: 1, activity_name: 'Ridge walk' },
        { day: 2, activity_name: 'Art visit' },
      ],
      note: 'An intention, not a promise.',
      alignment: { status: 'aligned', detail: 'Experiences are present.' },
    },
    stay: {
      name: 'Test Stay',
      address: 'Test address',
      photos: [],
      average_nightly_price: 225,
      budget_tier: 'mid-range',
      facilities: ['Spa'],
      website: 'https://example.com/stay',
      estimate_note: 'Estimated from map data.',
      price_status: 'ESTIMATED',
      availability_status: 'NOT_CHECKED',
    },
    tour_plan: [
      {
        day: 1,
        activities: [
          {
            activity_name: 'Ridge walk',
            activity_description: 'Walk slowly.',
            activity_location: 'The ridge',
            activity_address: 'Trail road',
            activity_image: [],
            activity_time: '08:00 AM - 10:00 AM',
            activity_cost: 20,
            distance_from_previous_km: null,
            place_id: null,
            business_status: null,
            availability_note: 'Place not verified on the map',
          },
        ],
      },
    ],
    total_cost_estimate: 1200,
    budget_check: {
      budget_per_night_usd: 400,
      budget_open_ended: false,
      rooms: 1,
      estimated_stay_nightly_usd: 225,
      stay_within_budget: true,
      status: 'ESTIMATED',
      note: 'Confirm the final payable amount.',
    },
    packing_tips: 'Bring layers.',
    travel_tips: 'Confirm availability.',
    source: 'generated',
  };
}

function setupTour(response = tourPlanResponse()) {
  const history = {
    _id: 'history-1',
    aiSessionId: 'session-1',
    activitySessionId: 'activity-1',
    selectedCity: 'São Miguel, Azores',
    selectedDestinationId: 'PT-AZO',
    suggestedCities: [
      { destinationId: 'PT-AZO', cityName: 'São Miguel, Azores' },
    ],
    tourPlan: [],
    intake: intake(),
  };
  const historyModel = {
    findOne: jest.fn().mockResolvedValue(history),
    findByIdAndUpdate: jest.fn().mockImplementation(async (_id, update) => ({
      ...history,
      ...update.$set,
    })),
  };
  const aiClient = {
    getTourPlan: jest.fn().mockResolvedValue(response),
    getSuggestedCities: jest.fn(),
    regenerateTourPlan: jest.fn().mockResolvedValue({
      ...response,
      source: 'regenerated',
    }),
  };
  const service = new HistoryService(
    historyModel as never,
    {} as never,
    aiClient as never,
  );
  return { service, history, historyModel, aiClient };
}

describe('HistoryService Velari tour plans', () => {
  it('requests by destination_id and persists feeling, budget, stay and activity verification', async () => {
    const { service, historyModel, aiClient } = setupTour();

    await service.generateTourPlan(
      { session_id: 'session-1', destination_id: 'PT-AZO' },
      userId,
    );

    expect(aiClient.getTourPlan).toHaveBeenCalledWith({
      session_id: 'session-1',
      destination_id: 'PT-AZO',
    });
    expect(historyModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'history-1',
      expect.objectContaining({
        $set: expect.objectContaining({
          selectedDestinationId: 'PT-AZO',
          feelingBlock: expect.objectContaining({
            headline: 'THE FEELING: REFLECTIVE',
            alignment: expect.objectContaining({ status: 'aligned' }),
          }),
          budgetCheck: expect.objectContaining({
            budgetPerNightUsd: 400,
            stayWithinBudget: true,
          }),
          stay: expect.objectContaining({
            priceStatus: 'ESTIMATED',
            availabilityStatus: 'NOT_CHECKED',
          }),
          tourPlan: [
            expect.objectContaining({
              activities: [
                expect.objectContaining({
                  placeId: null,
                  availabilityNote: 'Place not verified on the map',
                }),
              ],
            }),
          ],
        }),
        $unset: { selectedPropertyId: 1 },
      }),
      { new: true },
    );
  });

  it('rejects a destination that was not suggested in the session', async () => {
    const { service, aiClient } = setupTour();

    await expect(
      service.generateTourPlan(
        { session_id: 'session-1', destination_id: 'XX-NOT-SHOWN' },
        userId,
      ),
    ).rejects.toMatchObject<HttpException>({ status: 400 });
    expect(aiClient.getTourPlan).not.toHaveBeenCalled();
  });

  it('rewrites feeling_block and budget_check after itinerary regeneration', async () => {
    const { service, historyModel, aiClient } = setupTour();

    await service.regenerateTourPlan(
      {
        activity_session_id: 'activity-1',
        day_to_regenerate: 1,
        user_instruction: 'Quieter morning',
      },
      userId,
    );

    expect(aiClient.regenerateTourPlan).toHaveBeenCalledWith({
      activity_session_id: 'activity-1',
      day_to_regenerate: 1,
      user_instruction: 'Quieter morning',
    });
    expect(historyModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'history-1',
      expect.objectContaining({
        $set: expect.objectContaining({
          selectedDestinationId: 'PT-AZO',
          feelingBlock: expect.objectContaining({
            headline: 'THE FEELING: REFLECTIVE',
          }),
          budgetCheck: expect.objectContaining({ status: 'ESTIMATED' }),
        }),
      }),
      { new: true },
    );
  });

  it('restores an expired suggestion session before retrying the tour plan', async () => {
    const { service, aiClient } = setupTour();
    aiClient.getTourPlan
      .mockRejectedValueOnce(
        new HttpException(
          { message: 'AI service request failed', detail: 'Session expired' },
          404,
        ),
      )
      .mockResolvedValueOnce(tourPlanResponse());
    aiClient.getSuggestedCities.mockResolvedValue(
      suggestionResponse('session-restored', [
        ['PT-AZO', 'São Miguel, Azores', 'Portugal'],
        ['JP-KYO', 'Kyoto', 'Japan'],
      ]),
    );

    await service.generateTourPlan(
      { session_id: 'session-1', destination_id: 'PT-AZO' },
      userId,
    );

    expect(aiClient.getTourPlan).toHaveBeenLastCalledWith({
      session_id: 'session-restored',
      destination_id: 'PT-AZO',
    });
  });
});

function suggestionResponse(
  sessionId: string,
  items: Array<[string, string, string]>,
) {
  const cities = items.map(([id, city, country]) =>
    destination(id, city, country),
  );
  return {
    session_id: sessionId,
    match_status: 'matched',
    suggested_cities: cities,
    response: {
      match_status: 'matched',
      suggested_cities: cities,
      catalog_version: 'catalog-2',
      intake_mapping_version: 'mapping-2',
      scoring_version: 'scoring-2',
    },
  };
}

function setupSuggestionRegeneration(
  aiResponse: Record<string, unknown>,
  previousCities = [
    {
      destinationId: 'OLD-1',
      cityName: 'Old City',
      countryName: 'Old Country',
    },
  ],
) {
  const history = {
    _id: 'history-regen',
    aiSessionId: 'session-old',
    intake: intake(),
    suggestedCities: previousCities,
  };
  const historyModel = {
    findOne: jest.fn().mockResolvedValue(history),
    findByIdAndUpdate: jest.fn().mockImplementation(async (_id, update) => ({
      ...history,
      ...update.$set,
    })),
  };
  const aiClient = {
    regenerateSuggestedCities: jest.fn().mockResolvedValue(aiResponse),
    getSuggestedCities: jest.fn(),
  };
  const service = new HistoryService(
    historyModel as never,
    {} as never,
    aiClient as never,
  );
  return { service, history, historyModel, aiClient };
}

describe('HistoryService suggestion regeneration', () => {
  it('appends unseen destinations when intake is unchanged', async () => {
    const response = suggestionResponse('session-old', [
      ['NEW-1', 'New City', 'New Country'],
      ['NEW-2', 'Second City', 'Second Country'],
    ]);
    const { service, historyModel, aiClient } =
      setupSuggestionRegeneration(response);

    await service.regenerateSuggestedCities(
      { session_id: 'session-old', user_instruction: 'More options' },
      userId,
    );

    expect(aiClient.regenerateSuggestedCities).toHaveBeenCalledWith({
      session_id: 'session-old',
      user_instruction: 'More options',
    });
    expect(historyModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'history-regen',
      expect.objectContaining({
        $set: expect.objectContaining({
          suggestedCities: expect.arrayContaining([
            expect.objectContaining({ destinationId: 'OLD-1' }),
            expect.objectContaining({ destinationId: 'NEW-1' }),
            expect.objectContaining({ destinationId: 'NEW-2' }),
          ]),
        }),
      }),
      { new: true },
    );
  });

  it('merges and validates intake updates, then resets the shown list', async () => {
    const response = suggestionResponse('session-old', [
      ['RESET-1', 'Reset City', 'Reset Country'],
      ['RESET-2', 'Other City', 'Other Country'],
    ]);
    const { service, historyModel, aiClient } =
      setupSuggestionRegeneration(response);

    await service.regenerateSuggestedCities(
      {
        session_id: 'session-old',
        intake_updates: { trip_pace: 'balanced' },
      },
      userId,
    );

    expect(aiClient.regenerateSuggestedCities).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 'session-old',
        intake_updates: expect.objectContaining({
          trip_pace: 'balanced',
          budget_per_night: 400,
        }),
      }),
    );
    const update = historyModel.findByIdAndUpdate.mock.calls[0][1];
    expect(update.$set.intake.trip_pace).toBe('balanced');
    expect(update.$set.suggestedCities).toHaveLength(2);
    expect(update.$set.suggestedCities[0].destinationId).toBe('RESET-1');
  });

  it('rejects invalid intake updates before calling the AI or mutating history', async () => {
    const { service, historyModel, aiClient } = setupSuggestionRegeneration({});

    await expect(
      service.regenerateSuggestedCities(
        {
          session_id: 'session-old',
          intake_updates: {
            preferred_environments: ['surprise_me', 'coast'],
          },
        },
        userId,
      ),
    ).rejects.toMatchObject<HttpException>({ status: 422 });
    expect(aiClient.regenerateSuggestedCities).not.toHaveBeenCalled();
    expect(historyModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('restores an expired AI session and skips destinations already shown', async () => {
    const oldPage = suggestionResponse('session-restored', [
      ['OLD-1', 'Old City', 'Old Country'],
      ['OLD-2', 'Old City Two', 'Old Country Two'],
    ]);
    const newPage = suggestionResponse('session-restored', [
      ['NEW-1', 'New City', 'New Country'],
      ['NEW-2', 'Second City', 'Second Country'],
    ]);
    const previousCities = [
      {
        destinationId: 'OLD-1',
        cityName: 'Old City',
        countryName: 'Old Country',
      },
      {
        destinationId: 'OLD-2',
        cityName: 'Old City Two',
        countryName: 'Old Country Two',
      },
    ];
    const { service, historyModel, aiClient } = setupSuggestionRegeneration(
      newPage,
      previousCities,
    );
    aiClient.regenerateSuggestedCities
      .mockRejectedValueOnce(
        new HttpException(
          { message: 'AI service request failed', detail: 'Session not found' },
          404,
        ),
      )
      .mockResolvedValueOnce(newPage);
    aiClient.getSuggestedCities.mockResolvedValue(oldPage);

    await service.regenerateSuggestedCities(
      { session_id: 'session-old' },
      userId,
    );

    expect(aiClient.getSuggestedCities).toHaveBeenCalled();
    expect(aiClient.regenerateSuggestedCities).toHaveBeenLastCalledWith({
      session_id: 'session-restored',
      user_instruction: undefined,
    });
    const update = historyModel.findByIdAndUpdate.mock.calls[0][1];
    expect(update.$set.aiSessionId).toBe('session-restored');
    expect(
      update.$set.suggestedCities.map((city) => city.destinationId),
    ).toEqual(['OLD-1', 'OLD-2', 'NEW-1', 'NEW-2']);
  });
});
