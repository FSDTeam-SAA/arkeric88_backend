import 'reflect-metadata';
import { HttpException, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { HistoryAiClient } from './history-ai.client';

describe('HistoryAiClient errors', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('preserves structured 422 details from the AI service', async () => {
    const response = {
      data: {
        message: 'Validation failed',
        detail: [
          {
            loc: ['body', 'trip_nights'],
            msg: 'Does not match the selected dates',
          },
        ],
      },
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: {},
    };
    jest
      .spyOn(axios, 'post')
      .mockRejectedValue(
        new AxiosError(
          'Request failed',
          undefined,
          undefined,
          undefined,
          response as never,
        ),
      );

    const client = new HistoryAiClient();
    let thrown: unknown;
    try {
      await client.getSuggestedCities({ trip_nights: 4 });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(422);
    expect((thrown as HttpException).getResponse()).toEqual({
      message: 'Validation failed',
      detail: response.data.detail,
    });
  });

  it('returns a retryable 503 without exposing request configuration', async () => {
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('socket closed'));
    const client = new HistoryAiClient();

    await expect(
      client.getSuggestedCities({ private: 'value' }),
    ).rejects.toMatchObject<HttpException>({ status: 503 } as never);
  });
});
