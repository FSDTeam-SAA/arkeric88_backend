import 'reflect-metadata';
import {
  HttpException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HistoryController } from '../src/app/module/history/history.controller';
import { HistoryService } from '../src/app/module/history/history.service';

const validIntake = {
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
};

describe('Velari history HTTP contract (e2e)', () => {
  let app: INestApplication;
  const historyService = {
    generateSuggestedCities: jest.fn(async (dto) => {
      if (!dto.intake) {
        throw new HttpException(
          'The legacy questions_answers payload is no longer supported; send intake',
          422,
        );
      }
      return { accepted: dto };
    }),
    generateTourPlan: jest.fn(async (dto) => ({ accepted: dto })),
    regenerateSuggestedCities: jest.fn(async (dto) => ({ accepted: dto })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HistoryController],
      providers: [
        { provide: HistoryService, useValue: historyService },
        {
          provide: JwtService,
          useValue: {
            verify: () => ({
              id: '507f1f77bcf86cd799439011',
              email: 'guest@example.com',
              role: 'user',
            }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const post = (path: string) =>
    request(app.getHttpServer())
      .post(`/api/v1/history/${path}`)
      .set('Authorization', 'Bearer test-token');

  it('accepts the new Velari intake contract', async () => {
    await post('suggested-cities')
      .send({ payment_intent_id: 'pi_test', intake: validIntake })
      .expect(201);

    expect(historyService.generateSuggestedCities).toHaveBeenCalledWith(
      expect.objectContaining({ intake: expect.objectContaining(validIntake) }),
      '507f1f77bcf86cd799439011',
    );
  });

  it('rejects unknown intake fields at the HTTP boundary', async () => {
    await post('suggested-cities')
      .send({
        payment_intent_id: 'pi_test',
        intake: { ...validIntake, old_question: 'legacy' },
      })
      .expect(400);

    expect(historyService.generateSuggestedCities).not.toHaveBeenCalled();
  });

  it('returns 422 for the legacy questionnaire contract', async () => {
    await post('suggested-cities')
      .send({
        payment_intent_id: 'pi_test',
        questions_answers: { selected_archetype: 'legacy' },
      })
      .expect(422);
  });

  it('accepts destination_id and rejects property_id for tour plans', async () => {
    await post('tour-plan')
      .send({ session_id: 'session-1', destination_id: 'PT-AZO' })
      .expect(200);
    await post('tour-plan')
      .send({ session_id: 'session-1', property_id: 'retreat_118' })
      .expect(400);

    expect(historyService.generateTourPlan).toHaveBeenCalledTimes(1);
    expect(historyService.generateTourPlan).toHaveBeenCalledWith(
      { session_id: 'session-1', destination_id: 'PT-AZO' },
      '507f1f77bcf86cd799439011',
    );
  });

  it('accepts partial intake_updates for destination regeneration', async () => {
    await post('regenerate-suggested-cities')
      .send({
        session_id: 'session-1',
        intake_updates: { trip_pace: 'balanced' },
      })
      .expect(200);

    expect(historyService.regenerateSuggestedCities).toHaveBeenCalledWith(
      {
        session_id: 'session-1',
        intake_updates: { trip_pace: 'balanced' },
      },
      '507f1f77bcf86cd799439011',
    );
  });
});
