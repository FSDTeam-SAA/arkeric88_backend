import { Types } from 'mongoose';

export const HISTORY_SUMMARY_PROJECTION = {
  selectedCity: 1,
  selectedDestinationId: 1,
  'suggestedCities.destinationId': 1,
  'suggestedCities.cityName': 1,
  'suggestedCities.countryName': 1,
  'suggestedCities.numberOfDays': 1,
  'recommendedJourney.destination': 1,
  'userProfile.tripLengthDays': 1,
  'userProfile.budget': 1,
  'intake.trip_nights': 1,
  'intake.budget_per_night': 1,
  totalCostEstimate: 1,
  aiAnalysisStatus: 1,
  createdAt: 1,
} as const;

type HistorySummarySource = {
  _id: Types.ObjectId | string;
  selectedCity?: string;
  selectedDestinationId?: string;
  suggestedCities?: Array<{
    destinationId?: string;
    cityName?: string;
    countryName?: string;
    numberOfDays?: number;
  }>;
  recommendedJourney?: { destination?: string };
  userProfile?: { tripLengthDays?: number; budget?: number };
  intake?: { trip_nights?: number; budget_per_night?: number };
  totalCostEstimate?: number | null;
  aiAnalysisStatus?: string;
  createdAt?: Date;
};

export type HistorySummary = {
  _id: Types.ObjectId | string;
  destination: string | null;
  country: string | null;
  tripLength: number | null;
  budget: number | null;
  status: string | null;
  createdAt: Date | null;
};

export function toHistorySummary(
  history: HistorySummarySource,
): HistorySummary {
  const selectedDestination = findSelectedDestination(history);

  return {
    _id: history._id,
    destination:
      nonEmptyString(history.selectedCity) ??
      nonEmptyString(history.recommendedJourney?.destination) ??
      nonEmptyString(selectedDestination?.cityName) ??
      null,
    country: nonEmptyString(selectedDestination?.countryName) ?? null,
    tripLength:
      finiteNumber(selectedDestination?.numberOfDays) ??
      finiteNumber(history.userProfile?.tripLengthDays) ??
      finiteNumber(history.intake?.trip_nights) ??
      null,
    budget:
      finiteNumber(history.totalCostEstimate) ??
      finiteNumber(history.userProfile?.budget) ??
      finiteNumber(history.intake?.budget_per_night) ??
      null,
    status: nonEmptyString(history.aiAnalysisStatus) ?? null,
    createdAt: history.createdAt ?? null,
  };
}

function findSelectedDestination(history: HistorySummarySource) {
  const destinations = history.suggestedCities ?? [];
  const selectedId = nonEmptyString(history.selectedDestinationId);
  if (selectedId) {
    const byId = destinations.find(
      (destination) => destination.destinationId === selectedId,
    );
    if (byId) return byId;
  }

  const selectedCity = nonEmptyString(history.selectedCity)?.toLowerCase();
  if (selectedCity) {
    const byName = destinations.find(
      (destination) => destination.cityName?.toLowerCase() === selectedCity,
    );
    if (byName) return byName;
  }

  return destinations.length === 1 ? destinations[0] : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}
