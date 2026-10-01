# Frontend Migration Guide: Velari Travel Flow

This document lists the frontend changes required for the updated payment, destination suggestion, and tour-plan APIs.

## 1. Required frontend changes

| Area                    | Remove                                              | Use instead                                                                               |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Travel form payload     | `questions_answers` and wellness-archetype payloads | `intake`                                                                                  |
| Destination identity    | `property_id` / `propertyId`                        | `destination_id` in requests and `destinationId` in stored history responses              |
| Suggested-result state  | Assuming every request returns cities               | Handle `matchStatus: "matched"` and `matchStatus: "no_valid_result"`                      |
| Suggestion regeneration | Sending only a text instruction                     | Optionally send partial `intake_updates`                                                  |
| Tour-plan UI            | Basic stay and activity fields only                 | Render `feelingBlock`, `budgetCheck`, stay verification, and activity verification fields |
| Error display           | One generic message                                 | Read `message` and `errorSources[]`                                                       |

All authenticated requests require the existing bearer access token. The API prefix remains `/api/v1`.

## 2. Intake contract

Use this type as the single frontend form model. Do not send fields that are hidden or not applicable to the current selections.

```ts
type Restriction =
  | 'mobility_accessibility'
  | 'food_dietary'
  | 'no_long_drives'
  | 'no_intense_activity'
  | 'no_water_activities'
  | 'avoid_extreme_heat'
  | 'avoid_cold_weather'
  | 'other';

type RestrictionSeverity = 'must_avoid' | 'prefer_avoid';

interface VelariIntake {
  recent_feelings: Array<
    | 'stretched_thin'
    | 'stuck_in_routine'
    | 'disconnected'
    | 'curious'
    | 'energized'
    | 'turning_point'
    | 'content_ready'
    | 'something_else'
  >; // 1-2 unique values
  recent_feelings_other?: string; // required only for "something_else"

  trip_goals: Array<
    | 'restoration'
    | 'connection'
    | 'discovery'
    | 'adventure'
    | 'inspiration'
    | 'celebration'
    | 'reflection'
    | 'growth'
  >; // 1-2 unique values

  trip_prompt:
    | 'need_a_break'
    | 'time_with_someone'
    | 'celebrating'
    | 'curious_to_explore'
    | 'ready_for_change'
    | 'change_of_scenery'
    | 'no_particular_reason'
    | 'something_else';
  trip_prompt_other?: string; // required only for "something_else"

  preferred_moments: Array<
    | 'food_drinks'
    | 'art_history_culture'
    | 'nature_wildlife'
    | 'beaches_water'
    | 'movement_adventure'
    | 'quiet_privacy'
    | 'meeting_people'
    | 'spa_wellness'
    | 'music_nightlife'
    | 'learning_making'
  >; // 1-3 unique values

  preferred_environments: Array<
    | 'coast'
    | 'mountains'
    | 'forest_jungle'
    | 'desert'
    | 'countryside'
    | 'small_town'
    | 'vibrant_city'
    | 'surprise_me'
  >; // 1-2; "surprise_me" must be the only value

  trip_pace: 'mostly_open' | 'one_highlight' | 'balanced' | 'full_days';
  travel_party: 'solo' | 'couple' | 'group' | 'family';
  party_adults?: number; // 1-30
  party_children?: number; // 0-20
  party_rooms?: number; // 1-20
  party_child_ages?: number[]; // one age per child, each 0-17

  activity_restrictions?: Restriction[];
  restriction_severity?: Partial<Record<Restriction, RestrictionSeverity>>;
  restriction_notes?: string;

  departure_location: string;
  departure_latitude?: number;
  departure_longitude?: number;
  departure_country?: string;
  travel_distance: 'nearby' | 'manageable_flight' | 'anywhere';

  travel_timing: 'exact_dates' | 'flexible' | 'month_season';
  check_in_date?: string; // YYYY-MM-DD; exact_dates only
  check_out_date?: string; // YYYY-MM-DD; exact_dates only
  travel_period?:
    | 'spring'
    | 'summer'
    | 'autumn'
    | 'winter'
    | 'january'
    | 'february'
    | 'march'
    | 'april'
    | 'may'
    | 'june'
    | 'july'
    | 'august'
    | 'september'
    | 'october'
    | 'november'
    | 'december';
  trip_nights?: number; // 1-90

  budget_per_night: number; // USD 100-7000
  currency?: 'USD';
}
```

Form rules:

- Send latitude and longitude together, or omit both.
- For `exact_dates`, send both dates. Check-in cannot be in the past, check-out must be later, and `trip_nights` must match the date difference when supplied.
- For `month_season`, send `travel_period`. Do not send dates.
- Each selected restriction must have a severity. Remove its severity when the restriction is deselected.
- For `solo`, use one adult and no children. Room count cannot exceed the total traveller count.

## 3. Payment and automatic suggestion flow

### Create payment intent

`POST /api/v1/payments`

```json
{
  "amount": 49.99,
  "currency": "usd",
  "intake": {
    "recent_feelings": ["curious"],
    "trip_goals": ["discovery"],
    "trip_prompt": "curious_to_explore",
    "preferred_moments": ["nature_wildlife", "food_drinks"],
    "preferred_environments": ["coast"],
    "trip_pace": "balanced",
    "travel_party": "couple",
    "party_adults": 2,
    "party_children": 0,
    "party_rooms": 1,
    "departure_location": "Dhaka, Bangladesh",
    "departure_country": "Bangladesh",
    "travel_distance": "anywhere",
    "travel_timing": "exact_dates",
    "check_in_date": "2027-02-10",
    "check_out_date": "2027-02-15",
    "trip_nights": 5,
    "budget_per_night": 300,
    "currency": "USD"
  }
}
```

Store `data.paymentIntentId`, complete payment with Stripe using `data.clientSecret`, then poll:

`GET /api/v1/history/by-payment/{paymentIntentId}`

Use these states:

| `data.payment.status` | `data.payment.analysisStatus` | Frontend action                                     |
| --------------------- | ----------------------------- | --------------------------------------------------- |
| `pending`             | `pending`                     | Continue waiting for payment                        |
| `succeeded`           | `pending` or `processing`     | Show destination-generation progress and poll again |
| `succeeded`           | `completed`                   | Read `data.history` and show the result             |
| `succeeded`           | `failed`                      | Show `data.payment.analysisError` and retry option  |

The Stripe webhook starts suggestion generation automatically. Do not call the suggestion endpoint again after successful payment unless the application is intentionally using the manual fallback flow.

### Manual fallback

`POST /api/v1/history/suggested-cities`

```json
{
  "payment_intent_id": "pi_xxx",
  "intake": { "...": "same validated intake" }
}
```

Optional existing fields: `preferred_destinations` and `hope_of_this_trip`.

## 4. Suggested destination UI

Use the normalized `data.history` object, not the raw `data.aiResponse` object.

```ts
interface SuggestedCity {
  destinationId: string;
  cityName: string;
  countryName: string;
  worldRegion?: string;
  cityImage: string[];
  latitude: number | null;
  longitude: number | null;
  numberOfDays: number;
  description: string;
  matchScore?: number;
  matchReasons: string[];
  tradeoffs: string[];
  unresolvedFacts: string[];
  warnings: string[];
  restrictionChecks: Record<string, unknown>[];
  distanceCheck?: Record<string, unknown>;
  verification?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
}
```

Render by `history.matchStatus`:

- `matched`: display `history.suggestedCities` and use `city.destinationId` as the selection key.
- `no_valid_result`: do not show an empty/error card. Display the guidance from `history.noValidResult` and any `history.clarifications`.

## 5. Generate a tour plan

`POST /api/v1/history/tour-plan`

```json
{
  "session_id": "suggestion-session-id",
  "destination_id": "PT-AZO"
}
```

- `session_id` comes from `history.aiSessionId`.
- `destination_id` must be the exact `destinationId` from the latest suggested list.
- Remove `property_id` from the request and frontend state.

Read the normalized result from `data.history`:

- `feelingBlock`: emotional alignment content.
- `budgetCheck`: budget status, estimate, room count, and note.
- `stay`: includes price/availability status and estimate notes.
- `tourPlan[].activities[]`: includes `placeId`, `businessStatus`, `availabilityNote`, address, cost, images, and distance.
- `activitySessionId`: required for tour-plan regeneration.

## 6. Regeneration

### Regenerate destinations

`POST /api/v1/history/regenerate-suggested-cities`

```json
{
  "session_id": "suggestion-session-id",
  "user_instruction": "Prefer somewhere closer to home.",
  "intake_updates": {
    "trip_pace": "mostly_open",
    "budget_per_night": 350
  }
}
```

- `user_instruction` and `intake_updates` are optional, but at least one should normally be provided by the UI.
- Send only changed intake fields in `intake_updates`.
- Without `intake_updates`, new distinct destinations are appended to the existing list.
- With `intake_updates`, the previous suggestions and selected itinerary are reset; replace the UI with the returned list.
- Always replace the locally stored session ID with the returned `history.aiSessionId`, because the backend may recover an expired AI session.

### Regenerate tour plan

`POST /api/v1/history/regenerate-tour-plan`

```json
{
  "activity_session_id": "activity-session-id",
  "day_to_regenerate": 2,
  "user_instruction": "Prefer a quieter afternoon."
}
```

Omit `day_to_regenerate` to regenerate the complete itinerary. Replace the existing tour-plan state with the returned `data.history`, including the new `feelingBlock` and `budgetCheck` values.

## 7. Validation and error handling

Unknown request fields are rejected. Build payloads explicitly instead of spreading the full form or UI state into API requests.

```ts
interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errorSources: Array<{
    path: string | number;
    message: string;
  }>;
}
```

Map `errorSources[].path` to form fields when possible and use `message` as the page-level fallback. A legacy `questions_answers` request returns `422` and must not be retried without converting it to `intake`.

## 8. Frontend completion checklist

- [ ] Replace the old questionnaire model with `VelariIntake`.
- [ ] Send `intake` when creating the payment intent.
- [ ] Remove `questions_answers`, wellness-archetype transformation, and `property_id`.
- [ ] Poll history after Stripe payment success.
- [ ] Handle both suggestion match statuses.
- [ ] Use `destinationId` for selection and `destination_id` for the tour-plan request.
- [ ] Add partial `intake_updates` support to destination regeneration.
- [ ] Render the new feeling, budget, stay, and activity verification fields.
- [ ] Replace local session IDs with returned session IDs.
- [ ] Display field-level errors from `errorSources`.
