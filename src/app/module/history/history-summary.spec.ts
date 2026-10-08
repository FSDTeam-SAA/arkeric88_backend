import { Types } from 'mongoose';
import { toHistorySummary } from './history-summary';

describe('toHistorySummary', () => {
  it('returns only the fields required by the history table', () => {
    const id = new Types.ObjectId();
    const createdAt = new Date('2026-10-03T00:00:00.000Z');

    expect(
      toHistorySummary({
        _id: id,
        selectedCity: 'Rishikesh',
        selectedDestinationId: 'india-rishikesh',
        suggestedCities: [
          {
            destinationId: 'india-rishikesh',
            cityName: 'Rishikesh',
            countryName: 'India',
            numberOfDays: 3,
          },
        ],
        userProfile: { budget: 1600, tripLengthDays: 3 },
        totalCostEstimate: 2400,
        aiAnalysisStatus: 'completed',
        createdAt,
      }),
    ).toEqual({
      _id: id,
      destination: 'Rishikesh',
      country: 'India',
      tripLength: 3,
      budget: 2400,
      status: 'completed',
      createdAt,
    });
  });

  it('uses compact legacy fields when a completed itinerary is unavailable', () => {
    expect(
      toHistorySummary({
        _id: 'history-id',
        userProfile: { budget: 1400, tripLengthDays: 4 },
        aiAnalysisStatus: 'suggested_cities_ready',
      }),
    ).toEqual({
      _id: 'history-id',
      destination: null,
      country: null,
      tripLength: 4,
      budget: 1400,
      status: 'suggested_cities_ready',
      createdAt: null,
    });
  });
});
