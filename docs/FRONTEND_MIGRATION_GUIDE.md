# Frontend Integration Guide: Velari Travel Flow

This guide describes the normalized Nest API response under `data.history`.
Use it as the frontend contract. Do not render or build UI state from the
stored raw upstream fields (`suggestedCityResponse` and `tourPlanResponse`).

All endpoints use the `/api/v1` prefix and require the existing bearer access
token unless noted otherwise. The API currently permits all origins without
credentials. It uses bearer tokens, not cookie authentication.

## 1. Guest-display boundary

Render only the guest-safe fields below. These fields may still exist in a
stored history document for audit or application control, but must not be
rendered to travelers:

- `validation` and its issue details. Use only `validation.displayReady` to
  decide whether to show the itinerary or offer regeneration.
- `adjustments`; their guest-safe wording is already in `guestNotes`.
- `bookingStatus.reasons` (not included in normalized responses).
- `budgetCheck`, `placeId`, `businessStatus`, coordinates, raw verification,
  evidence, scores, restriction checks, and distance checks.
- `suggestedCityResponse` and `tourPlanResponse`.

When `history.validation?.displayReady === false` or
`history.aiAnalysisStatus === 'failed'`, do not show a finished itinerary.
Show a clear regenerate action using `activitySessionId`.

## 2. Destination suggestions

Use `history.suggestedCities` and the exact `destinationId` when requesting a
tour plan. Each guest-facing suggestion includes:

```ts
interface SuggestedCity {
  destinationId: string;
  cityName: string;
  countryName: string;
  cityImage: string[];
  description: string;
  primaryFeeling?: string;
  matchScore?: number;
  matchReasons: string[];
  tradeoffs: string[];
  unresolvedFacts: string[];
}
```

Show the destination feeling as:

```text
Designed to help you feel: **{primaryFeeling}**
```

Render `tradeoffs` only. `warnings` is retained only for older clients and can
duplicate the same text.

## 3. Generate and display an itinerary

Create an itinerary with:

```http
POST /api/v1/history/tour-plan
```

```json
{
  "session_id": "suggestion-session-id",
  "destination_id": "PT-AZO"
}
```

The normalized response is `data.history`. The most relevant guest-safe shape
is:

```ts
interface HistoryItinerary {
  activitySessionId: string;
  feelingBlock?: {
    headline: string;
    primaryFeeling?: string;
    explanation?: string;
    markdown?: string;
  };
  bookingStatus?: {
    readyToBook: false;
    guestLabel: string;
  };
  stops: Array<{
    stop: number;
    baseArea: string;
    nights: number;
    firstDay: number;
    lastDay: number;
    stay?: Stay;
  }>;
  tourPlan: TourPlanDay[];
  priceBreakdown?: PriceBreakdown;
  guestNotes: string[];
  validation?: { displayReady: boolean };
}

interface Stay {
  name: string;
  address: string;
  rating?: number;
  priceLevel?: string;
  averageNightlyPrice?: number | string;
  whySelected?: string;
  photos: string[];
  estimateNote?: string;
}

interface TourPlanDay {
  day: number;
  stop?: number;
  dayType?: 'standard' | 'transfer';
  activities: Array<{
    itemType?: 'experience' | 'meal' | 'transfer' | 'free_time';
    activityName: string;
    activityTime: string;
    activityDescription: string;
    activityAddress: string;
    activityImage: string[];
    whySelected?: string;
    travelMinutesFromPrevious?: number | null;
    travelFrom?: string;
    priceIndication?: string;
    rating?: number | null;
    openSlot?: boolean;
    transferMinutes?: number | null;
    transferBufferMinutes?: number | null;
    includesFerry?: boolean;
    viator?: {
      product_code?: string;
      title?: string;
      booking_url?: string;
      rating?: number;
      review_count?: number;
      from_price?: number;
      currency?: string;
    };
  }>;
}
```

Render one section for each `stops[]` entry. The legacy top-level `stay` is
only retained for older clients; prefer the stay belonging to each stop.

For each experience and planned restaurant, show `whySelected` and a travel
line when `travelMinutesFromPrevious` is present. For `transfer` items, render
a travel card; for `free_time` and `meal` items with `openSlot: true`, render a
light open-time line.

Render `feelingBlock.markdown` as-is, or construct it from `primaryFeeling`
and `explanation`. Do not display old “You chose” or “Why it fits” sections.

`bookingStatus.readyToBook` remains false until live booking verification is
available. Show `bookingStatus.guestLabel` once near pricing; never show a
Book-now state while it is false.

## 4. Pricing and Viator

```ts
interface PriceBreakdown {
  currency?: string;
  appliesTo?: string;
  lines: Array<{
    category: string;
    label: string;
    amount: number | null;
    perPerson?: number | null;
    basis: string;
    details: string[];
  }>;
  total: number | null;
  totalLabel?: string;
  totalWithheldReason?: string | null;
  whatMayVary?: string;
}
```

Render every line, its label, amount, and basis. When `total` is `null`, show
`totalWithheldReason` instead of a total. Do not use an older saved
`totalCostEstimate` as a fallback.

When an activity has `viator`, show its booking link and, when available:

```text
From $X per person · ★ rating (reviews) on Viator
```

All Viator activities are scheduled estimates, not confirmed bookings.

## 5. Flexible date recommendations

Call this after the guest chooses flexible timing or a month/season and enters
`trip_nights`:

```http
POST /api/v1/history/recommend-travel-dates
```

Use the step 1-10 intake fields but omit `budget_per_night`,
`check_in_date`, and `check_out_date`. `travel_timing` must be `flexible` or
`month_season`; `exact_dates` is rejected. Optional `earliest_check_in` and
`latest_check_out` must be sent together, and their range must fit
`trip_nights`.

```json
{
  "recent_feelings": ["stretched_thin"],
  "trip_goals": ["reflection"],
  "trip_prompt": "need_a_break",
  "preferred_moments": ["quiet_privacy"],
  "preferred_environments": ["mountains"],
  "trip_pace": "one_highlight",
  "travel_party": "solo",
  "departure_location": "London",
  "travel_distance": "anywhere",
  "travel_timing": "month_season",
  "travel_period": "may",
  "trip_nights": 5,
  "destination_id": "PT-AZO"
}
```

The response exposes `recommended`, up to two `alternatives`, `summary`, and
`availabilityNote`. Always display `availabilityNote` with the recommended
dates. When the guest accepts dates, submit them to the destination-suggestion
flow as `travel_timing: "exact_dates"` with `check_in_date` and
`check_out_date`.

## 6. Regeneration and saved history

Regenerate an itinerary with:

```http
POST /api/v1/history/regenerate-tour-plan
```

```json
{
  "activity_session_id": "activity-session-id",
  "user_instruction": "Prefer a quieter afternoon."
}
```

Always replace local itinerary state with the returned `data.history`,
including a possibly new `activitySessionId` and validation state.

For Search History, fetch user-owned records using:

```http
GET /api/v1/history/my
GET /api/v1/history/my/{historyId}
```

The eye icon must retain and use the Mongo `historyId`, not an upstream
activity session ID. Show a loading state while history loads. On failure, show
a retry action; API failures are server-logged.

## 7. Error handling checklist

- Build request payloads explicitly. Unknown fields are rejected.
- Use the bearer access token on every authenticated request.
- Read the API `message` and `errorSources[]` for errors.
- Handle `matchStatus: "matched"` and `"no_valid_result"` separately.
- Never render an itinerary when `validation.displayReady` is false.
- Always show a retry option for failed history or date-recommendation loads.
