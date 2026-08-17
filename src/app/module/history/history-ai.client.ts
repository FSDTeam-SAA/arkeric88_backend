import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import config from 'src/app/config';

type SuggestedCityPayload = Record<string, unknown>;

type TourPlanPayload = {
  session_id: string;
  selected_city: string;
  property_id: string;
};

type RegenerateSuggestedCityPayload = { session_id: string; user_instruction: string };

type RegenerateTourPlanPayload = {
  activity_session_id: string;
  day_to_regenerate?: number | null;
  user_instruction: string;
};

@Injectable()
export class HistoryAiClient {
  private readonly logger = new Logger(HistoryAiClient.name);

  async getSuggestedCities(payload: SuggestedCityPayload) {
    return this.post(config.ai.suggestedCityUrl, payload);
  }

  async getTourPlan(payload: TourPlanPayload) {
    return this.post(config.ai.tourPlanUrl, payload);
  }

  async regenerateSuggestedCities(payload: RegenerateSuggestedCityPayload) {
    return this.post(config.ai.regenerateSuggestedCityUrl, payload);
  }

  async regenerateTourPlan(payload: RegenerateTourPlanPayload) {
    return this.post(config.ai.regenerateTourPlanUrl, payload);
  }

  private async post<TPayload>(url: string, payload: TPayload) {
    try {
      const { data } = await axios.post(url, payload, {
        timeout: config.ai.timeoutMs,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return data;
    } catch (error) {
      this.logger.error(`AI request failed for ${url}`, error as Error);

      if (error instanceof AxiosError) {
        const responseData = error.response?.data as
          | {
              message?: string;
              detail?: Array<{ loc?: Array<string | number>; msg?: string }> | string;
            }
          | string
          | undefined;

        let detailMessage: string | undefined;
        if (typeof responseData === 'object' && responseData !== null) {
          if (Array.isArray(responseData.detail)) {
            detailMessage = responseData.detail
              .map((issue) => `${issue.loc?.join('.') || 'request'}: ${issue.msg || 'Invalid value'}`)
              .join('; ');
          } else if (typeof responseData.detail === 'string') {
            detailMessage = responseData.detail;
          }
        }

        const message =
          typeof responseData === 'string'
            ? responseData
            : detailMessage || responseData?.message || 'AI service request failed';

        throw new HttpException(message, error.response?.status || 502);
      }

      throw new InternalServerErrorException('Unable to process AI request');
    }
  }
}
