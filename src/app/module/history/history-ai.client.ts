import { HttpException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import config from 'src/app/config';
import { safeErrorMessage } from 'src/app/utils/redact-sensitive-fields';

type SuggestedCityPayload = Record<string, unknown>;

type TourPlanPayload = {
  session_id: string;
  destination_id: string;
};

type RegenerateSuggestedCityPayload = {
  session_id: string;
  user_instruction?: string;
  intake_updates?: Record<string, unknown>;
};

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

  async recommendTravelDates(payload: Record<string, unknown>) {
    return this.post(config.ai.recommendTravelDatesUrl, payload);
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
      // Axios errors retain request config (including the JSON body). Never pass
      // the whole error object to the logger because Velari free-text fields are private.
      this.logger.error(
        `AI request failed for ${url}: ${safeErrorMessage(error)}`,
      );

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | {
              message?: string;
              detail?:
                | Array<{ loc?: Array<string | number>; msg?: string }>
                | string;
            }
          | string
          | undefined;

        if (typeof responseData === 'object' && responseData !== null) {
          throw new HttpException(
            {
              message: responseData.message || 'AI service request failed',
              detail: responseData.detail,
            },
            error.response?.status || 502,
          );
        }

        throw new HttpException(
          responseData || 'AI service request failed',
          error.response?.status || 502,
        );
      }

      throw new HttpException('Unable to reach AI service', 503);
    }
  }
}
