import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import config from 'src/app/config';

type SuggestedCityPayload = {
  questions_answers: Record<string, unknown>;
  preferred_destinations?: string;
  hope_of_this_trip?: string;
};

type TourPlanPayload = {
  session_id: string;
  selected_city: string;
  property_id?: string;
};

@Injectable()
export class HistoryAiClient {
  private readonly logger = new Logger(HistoryAiClient.name);

  async getSuggestedCities(payload: SuggestedCityPayload) {
    return this.post(config.ai.suggestedCityUrl, payload);
  }

  async getRetreatRecommendations(payload: Record<string, unknown>) {
    return this.post(config.ai.retreatRecommendationsUrl, payload);
  }

  async getTourPlan(payload: TourPlanPayload) {
    return this.post(config.ai.tourPlanUrl, payload);
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
        const responseData = error.response?.data;
        this.logger.error(
          `AI validation/provider response: ${JSON.stringify(responseData)}`,
        );
        const message =
          typeof responseData === 'string'
            ? responseData
            : responseData?.detail ||
              responseData?.message ||
              'AI service request failed';

        throw new HttpException(message, error.response?.status || 502);
      }

      throw new InternalServerErrorException('Unable to process AI request');
    }
  }
}
