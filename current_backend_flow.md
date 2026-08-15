# Current Backend Flow

This document describes the current NestJS backend flow for the retreat recommendation product.

Base URL:

```text
/api/v1
```

All protected endpoints require:

```http
Authorization: Bearer <access_token>
```

## 1. Current user journey

```text
15-question questionnaire
        ↓
Create one-time Stripe PaymentIntent
        ↓
Complete payment
        ↓
Stripe webhook marks payment as succeeded
        ↓
Backend requests v2 retreat recommendations
        ↓
Frontend polls payment/history status
        ↓
User selects one retreat property
        ↓
Backend requests the property-based tour plan
```

The user pays once. Selecting a retreat property and generating its itinerary does not require a second payment.

## 2. Create payment

```http
POST /api/v1/payments
```

The endpoint creates a Stripe PaymentIntent and stores the questionnaire together with the payment record.

The current test page sends the v2 questionnaire in `retreat_questionnaire`:

```json
{
  "amount": 2,
  "currency": "usd",
  "description": "Test one-time payment",
  "nameOnCard": "John Doe",
  "email": "john@example.com",
  "country": "US",
  "zipCode": "12345",
  "retreat_questionnaire": {
    "archetype": "burned_out_achiever",
    "escape_from": "noise_stimulation",
    "arrival_priority": "silence_privacy",
    "structure_preference": "optional_rituals",
    "reset_style": "digital_disconnection",
    "physical_intensity": "gentle",
    "party": {
      "type": "solo",
      "adults": 1,
      "children": 0
    },
    "spirituality": "none",
    "travel_window": {
      "mode": "flexible"
    },
    "planning_service_level": "well_planned",
    "restrictions": {
      "text": "No hiking or water activities",
      "codes": []
    },
    "settings": ["ocean_beach"],
    "budget": {
      "currency": "USD",
      "per_person_per_night_max": 500,
      "open_ended": false
    },
    "duration": {
      "bucket": "4_7_nights"
    },
    "transform_focus": ["Burnout Recovery", "Sleep", "Digital Detox"]
  }
}
```

The response contains:

- `paymentIntentId`
- `clientSecret`
- `publishableKey`
- payment amount and currency

The frontend uses `clientSecret` with Stripe.js to confirm the payment.

## 3. Stripe webhook

```http
POST /api/v1/webhook
```

The webhook must receive Stripe's raw request body so that the signature can be verified.

When `payment_intent.succeeded` is received:

1. Payment status becomes `succeeded`.
2. The stored questionnaire version is checked.
3. v2 questionnaire data triggers the retreat recommendation flow.
4. Legacy questionnaire data continues to use the old suggested-city flow.

Relevant payment analysis states are:

```text
pending → processing → completed
                    ↘ failed
```

## 4. v2 recommendation request

The backend calls the configured external AI endpoint:

```text
AI_RETREAT_RECOMMENDATIONS_URL
```

Default value:

```text
https://arkeric88.onrender.com/v2/retreat-recommendations
```

The outbound request contains only the v2 questionnaire fields. Payment information is not sent to the AI service.

The backend normalizes the payload before sending it:

- Removes unsupported fields such as `schema_version`.
- Removes `season` and `months` when travel mode is `flexible`.
- Requires a season when travel mode is `specific`.
- Requires valid month values from `1` to `12` for `choose_month`.
- Removes placeholder restriction code `string`.
- Rejects invalid or placeholder transform-focus values.
- Keeps only supported setting values.

## 5. Get recommendation status

```http
GET /api/v1/history/by-payment/{paymentIntentId}
```

This endpoint returns both payment processing status and the stored history record.

Example successful payment state:

```json
{
  "payment": {
    "status": "succeeded",
    "analysisStatus": "completed"
  },
  "history": {
    "aiAnalysisStatus": "suggested_cities_ready",
    "recommendationSessionId": "...",
    "retreatRecommendations": []
  }
}
```

The frontend should poll this endpoint after payment confirmation until:

- `history` is available and `aiAnalysisStatus` is `suggested_cities_ready`, or
- `payment.analysisStatus` becomes `failed`.

## 6. Manual v2 recommendation retry

```http
POST /api/v1/history/retreat-recommendations
```

This endpoint is useful when the Stripe webhook completed the payment but the automatic recommendation request failed.

The request uses the v2 questionnaire fields at the root and includes the payment intent ID:

```json
{
  "payment_intent_id": "pi_...",
  "archetype": "burned_out_achiever",
  "escape_from": "noise_stimulation",
  "arrival_priority": "silence_privacy",
  "structure_preference": "almost_none",
  "reset_style": "digital_disconnection",
  "physical_intensity": "gentle",
  "party": {
    "type": "solo",
    "adults": 1,
    "children": 0
  },
  "spirituality": "none",
  "travel_window": {
    "mode": "flexible"
  },
  "planning_service_level": "loose",
  "restrictions": {
    "text": "",
    "codes": []
  },
  "settings": ["mountains"],
  "budget": {
    "currency": "USD",
    "per_person_per_night_max": 500,
    "open_ended": false
  },
  "duration": {
    "bucket": "1_3_nights"
  },
  "transform_focus": ["Burnout Recovery"]
}
```

## 7. Recommendation data stored in history

The history record stores:

- `recommendationSessionId`
- `schemaVersion`
- `scoringVersion`
- `answerMappingVersion`
- `databaseVersion`
- `retreatRecommendations`
- `excludedCount`
- `totalCandidateCount`
- `extractedRestrictions`
- `dataGaps`
- payment information

Each recommendation contains:

- `propertyId`
- `propertyName`
- country and region
- match score
- ten-part score breakdown
- match reasons
- warnings
- restriction status
- price information
- best-season information

## 8. Generate a tour plan for a selected property

```http
POST /api/v1/history/tour-plan
```

Request:

```json
{
  "session_id": "recommendation-session-id",
  "selected_city": "Revivo Wellness Resort",
  "property_id": "retreat_118"
}
```

`property_id` is the important v2 field. It identifies the exact property selected from the recommendation list. `selected_city` remains required for backward compatibility, but when `property_id` is present the exact property takes priority.

The backend verifies that the property belongs to the recommendation session before requesting the itinerary.

## 9. External tour-plan dependency

The backend currently sends the tour-plan request to:

```text
AI_TOUR_PLAN_URL
```

Default value:

```text
https://arkeric88.onrender.com/get_tour_plan
```

For v2, the external service must support:

- `recommendationSessionId` passed as `session_id`
- `property_id`
- exact retreat-property lookup

If the external service responds with:

```text
City session not found.
```

then the deployed external `/get_tour_plan` implementation is still using the legacy city-session lookup. The NestJS backend cannot resolve that external session internally; the external AI service must be updated or a v2-compatible tour-plan URL must be configured.

## 10. Legacy compatibility

The following legacy behavior remains available:

- `POST /api/v1/history/suggested-cities`
- `GET /api/v1/history/by-payment/{paymentIntentId}`
- City-based tour-plan requests without `property_id`
- Legacy questionnaire data stored in `questions_answers`

New v2 payments use `questionnaireVersion: "v2"`. Legacy payments use `questionnaireVersion: "legacy"`.

## 11. Environment variables

```env
AI_SUGGESTED_CITY_URL=https://arkeric88.onrender.com/get_suggested_city
AI_RETREAT_RECOMMENDATIONS_URL=https://arkeric88.onrender.com/v2/retreat-recommendations
AI_TOUR_PLAN_URL=https://arkeric88.onrender.com/get_tour_plan
AI_REQUEST_TIMEOUT_MS=60000
```

The external v2 recommendation service and the external property-aware tour-plan service must be deployed and reachable for the complete flow to work.
