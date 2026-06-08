# ArronWH Backend — API Report & Frontend Integration Guide

**Generated for:** The Figma boiler-quote design delivered by the user.
**Target backend:** `arronwh_backend` (NestJS + MongoDB + Stripe).

This document explains (1) every endpoint that already exists, (2) exactly
how the new HTML frontend in `/public` maps each screen to those endpoints,
(3) the gaps between the design and the current API, and (4) the precise
changes needed server-side so the flow works end-to-end.

---

## 1. Project structure delivered

```
arronwh_backend/
├── src/               ← your existing NestJS backend (UNCHANGED)
├── public/            ← NEW: frontend delivered in this session
│   ├── index.html     ← landing page
│   ├── quote.html     ← multi-step quote SPA (all ~25 screens)
│   ├── css/styles.css
│   └── js/
│       ├── api-client.js    ← thin fetch wrapper over /api/v1/*
│       └── quote-flow.js    ← state machine driving all quote screens
└── API-REPORT.md      ← this file
```

**How to run:** start your NestJS server on port 3000 (`npm run start:dev`),
then open `public/index.html` in a browser. The SPA calls
`http://localhost:5000/api/v1` — change `window.API_BASE` in `quote.html`
if your backend lives elsewhere.

Because CORS is already wide-open in `src/main.ts`
(`app.enableCors({ origin: "*", credentials: true })`), no extra CORS
configuration is needed.

---

## 2. Current backend endpoint inventory

Base path is set globally to `/api/v1` in `src/main.ts`.

### 2.1 Products (boilers) — `src/app/module/product/product.controller.ts`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET    | `/products` | public | List boilers (pagination, searchTerm, boilerAbility filters) |
| GET    | `/products/:id` | public | Get one boiler |
| POST   | `/products` | admin (Bearer) | Create boiler (multipart: `data` JSON + image fields) |
| PUT    | `/products/:id` | admin | Update boiler |
| DELETE | `/products/:id` | admin | Delete boiler |

Entity (`product.entitiy.ts`) exposes: `title`, `description`, `shortDescription`,
`images[]`, `badges[]`, `price`, `discountPrice`, `payablePrice`, `monthlyPrice`,
`boilerAbility`, `boilerFeatures[]`, `featureInformation`, `boilerIncludedData`,
`includedImages[]`, `boilerInstallationGuide[]`.

**Used by the SPA on:** Boiler select screen (step 17), Boiler details screen (step 18).

### 2.2 Controllers — `controller/controller.controller.ts`

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/controller` | List smart controllers |
| GET    | `/controller/:id` | Single |
| POST / PUT / DELETE | `/controller[/:id]` | Admin |

**Used by the SPA on:** Choose controls screen (step 19).

### 2.3 Extras — `extra/extra.controller.ts`
Same CRUD shape as Controllers. **Used by:** Add extras screen (step 20).

### 2.4 Quote — `quote/quote.controller.ts`

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/quote` | Create the full customer quote |
| GET    | `/quote?searchTerm=&page=&limit=` | List quotes |
| GET    | `/quote/:id` | Single quote |
| PATCH  | `/quote/:id` | Update |
| DELETE | `/quote/:id` | Delete |

Body accepted by `POST /quote` (see `create-quote.dto.ts`):

```json
{
  "personalInfo": {
    "title": "Mr",
    "fastName": "John",
    "sureName": "Doe",
    "email": "john@example.com",
    "mobleNumber": "+4479...",
    "postcode": "SW1A 1AA"
  },
  "quizAnswers": [{ "question": "...", "answer": "..." }],
  "productId": "ObjectId",
  "controller": "ObjectId",
  "extra": "ObjectId",
  "installDate": "2026-05-01",
  "installAddress": "1 Street, City",
  "payByCard": true,
  "payMounthly": false,
  "payMounthlyData": { "deposit": 100, "mounthNumber": 120, "amount": 15 }
}
```

The Quote entity also keeps a `bookingId` reference back to a Booking once
the user confirms — this is maintained server-side.

**Used by the SPA on:** final "Confirm & pay" submit (step 24).

### 2.5 Booking — `booking/booking.controller.ts`

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/booking` | Turn a saved quote into a confirmed booking. Body: `{ quote, price }` |
| GET    | `/booking` | List (admin view) |
| GET    | `/booking/:id` | Single |
| DELETE | `/booking/:id` | Delete |
| PATCH  | `/booking/booking-for/:id` | Set kind: `'survey' \| 'installation'` |

**Used by the SPA on:** right after the quote is created (final submit).

### 2.6 Payment — `payment/payment.controller.ts`

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/payment/:bookingId` | Creates a Stripe **PaymentIntent** for the booking total. Returns client secret. |
| GET    | `/payment` | Admin list of payments |
| GET    | `/payment/:id` | Single payment |

**Used by the SPA on:** final card-payment step (step 24). The front-end
takes the returned `clientSecret` and hands it to Stripe.js (you will need
to add Stripe.js / Elements markup to `quote.html` when wiring real cards).

### 2.7 Auth — `auth/auth.controller.ts`

`POST /auth/register | /login | /forgot-password | /verify | /reset-password | /change-password`.

Not used by the anonymous customer quote flow, but is already there for any
account screens you want to add later.

### 2.8 Other modules that exist but aren't used by this customer flow

- `faq` — FAQs
- `webhook` — Stripe webhooks (this is how your backend marks bookings as paid)
- `user` — CRUD for users (admin)
- `contact`, `subscribe`, `dashboard`, `quize`, `twilio` — these modules
  exist in the folder tree but are **not registered in `src/app.module.ts`**
  (see §4, gap 3). They are currently unreachable at runtime.

---

## 3. Front-end ↔ back-end mapping (per Figma screen)

| Figma screen | SPA step | Backend call | Notes |
|---|---|---|---|
| Landing page | `index.html` | none | Static marketing page |
| Steps 1–15 (describe home → roof position) | `renderQuestion` × 15 | **none** | Answers accumulate in `state.quizAnswers[]` and are sent once with `POST /quote` |
| Postcode entry | `renderPostcode` | **none yet** (see gap 1) | Stored in `state.postcode`; a real `/postcode/:code` endpoint should replace the stub |
| Choose boiler | `renderBoilerSelect` | `GET /products?limit=20` | Renders each doc as a card |
| Boiler details | `renderBoilerDetails` | uses cached product | No extra call needed |
| Choose controls | `renderControls` | `GET /controller?limit=20` | Selection is optional |
| Add extras | `renderExtras` | `GET /extra?limit=20` | Selection is optional |
| Your total price | `renderTotal` | **none** (price computed client-side from selected docs) | See gap 2 |
| When should we install | `renderInstallDate` | **none yet** (see gap 4) | Uses a client-side fallback calendar |
| Where are we visiting / Enter address manually | `renderAddress` | **none** | Values collected into `state.personalInfo` + `state.installAddress` |
| How would you like to pay / Pay monthly | `renderPayMethod` | **none yet** | Figures the monthly plan locally |
| Final submit (Desktop-9/10/11/12/13) | `submitQuote` | `POST /quote` → `POST /booking` → `PATCH /booking/booking-for/:id` → `POST /payment/:bookingId` | The core integration |
| Confirmation page (Desktop-13) | `renderConfirmation` | shows booking id + clientSecret | Hook up Stripe.js here for real card capture |

---

## 4. Gaps between the Figma design and the current backend

These are the **concrete** pieces I discovered while wiring the frontend.
Because this session cannot modify existing `.ts` files, the fixes are
described below for a developer to apply. The frontend is already wired
for them — no front-end changes will be needed when they land.

### Gap 1 — Postcode lookup is missing

**Design expectation:** the "Postcode" screen should call an address-lookup
service so the user can pick their exact address from a dropdown.

**Current backend:** no endpoint exists. The SPA falls back to a two-row stub.

**Recommended fix (to be applied in `src/app/module/quote/` or a new `address` module):**

```ts
// new file: src/app/module/address/address.controller.ts
@Get(':postcode')
async lookup(@Param('postcode') postcode: string) {
  // call a 3rd-party API like getAddress.io / Royal Mail PAF
  // return { postcode, addresses: [{ line1, town, postcode }, ...] }
}
```

When this lands, change the SPA's `api.lookupPostcode` in
`public/js/api-client.js` to call `GET /address/:postcode` instead of
returning the stub.

### Gap 2 — Server-side price computation

**Design expectation:** a single "Your total price is £X,XXX" number that
matches what the backend will actually charge, including VAT and any
promotions.

**Current backend:** there is no pricing endpoint. The SPA currently sums
`product.discountPrice + controller.price + extra.price` on the client —
this is fine for the happy path but not authoritative.

**Recommended fix:**

```ts
// add to quote.controller.ts
@Get('price')
async computePrice(@Query('productId') productId, @Query('controller') c,
                   @Query('extra') e, @Query('postcode') pc) {
  return this.quoteService.computePrice({ productId, controller: c, extra: e, postcode: pc });
}
```

The service should apply discounts, VAT, region surcharges, etc. The SPA
already has a `state.price` field; change `renderTotal` to await this call
instead of computing locally.

### Gap 3 — Modules registered in the folder but missing from `AppModule`

`src/app.module.ts` imports only these feature modules:

```
Payment, Webhook, Auth, Controller, Extra, Faq, Quote, Booking, Product, User
```

The following directories exist in `src/app/module` but are **not
imported** into `AppModule` and therefore their routes 404:

- `contact`      — contact-form module
- `subscribe`    — newsletter subscribe
- `dashboard`    — admin dashboard aggregates
- `quize`        — admin-authored quiz questions (distinct from `quote.quizAnswers`)
- `twilio`       — SMS / voice

**Fix:** add them to the `imports: []` array in `app.module.ts`. This is
one line per module.

### Gap 4 — Install-date availability / slot management

**Design expectation:** a calendar that grays out days the installer is
already fully booked.

**Current backend:** no endpoint for slots. The SPA falls back to a rule
("weekdays only, starting 3 days out"). Book two customers on the same
day and they will both succeed.

**Recommended fix:** add `GET /booking/slots?from=YYYY-MM-DD&to=YYYY-MM-DD`
that returns `{ slots: [{ date, available, remaining }] }`. The SPA's
`api.getInstallSlots()` stub already shows the expected shape.

### Gap 5 — Minor field-name typos in `Quote` entity / DTO

The `PersonalInfoDto` and the Mongo schema use these field names:

- `fastName` (intended: `firstName`)
- `sureName` (intended: `surname`)
- `mobleNumber` (intended: `mobileNumber`)
- `payMounthly` / `payMounthlyData` / `mounthNumber` (intended: `payMonthly` / `monthNumber`)

The frontend currently sends the exact typoed names so the POST succeeds.
If/when you correct the spelling server-side, update the same key names
inside `state.personalInfo` and the `createQuote` payload in
`public/js/quote-flow.js`.

### Gap 6 — No "quick rebuild existing boiler" shortcut endpoint

Some design screens hint at a one-click "rebook my last boiler" path (e.g.
"Save my progress"). Nothing in the backend supports resuming a quote-in-
progress without an account. Consider persisting an anonymous draft quote
id in `localStorage` and pairing it with `PATCH /quote/:id`.

### Gap 7 — Payment flow is half-finished

`POST /payment/:bookingId` creates a Stripe PaymentIntent but:

1. There is no front-end code in the session that renders Stripe Elements.
   The SPA shows the returned `clientSecret` in the confirmation card as a
   placeholder. To actually capture cards you need to:

   - `<script src="https://js.stripe.com/v3/"></script>` in `quote.html`
   - Create a Stripe Elements card field on the pay step
   - Call `stripe.confirmCardPayment(clientSecret, { payment_method: { card } })`

2. The `/webhook` module is the bit that marks the booking as paid in
   Mongo. Make sure your Stripe dashboard points its webhook at
   `POST https://your-domain/api/v1/webhook` (the raw-body middleware for
   exactly this path is already set up in `main.ts`, line 17).

### Gap 8 — No admin image host for the demo

The product/controller/extra endpoints accept multipart uploads and push
images to Cloudinary (see `cloudinary` dep + `fileUploder.ts`). Until you
upload real assets, the cards in the SPA render emoji placeholders. This
is cosmetic only — the flow still works.

---

## 5. End-to-end data flow (final submit)

When the user clicks **Confirm & pay** on the last step, the SPA runs
this sequence inside `submitQuote()`:

```
1. POST /api/v1/quote
   body: { personalInfo, quizAnswers, productId, controller, extra,
           installDate, installAddress, payByCard, payMounthly, payMounthlyData }
   → { data: { _id: quoteId, … } }

2. POST /api/v1/booking
   body: { quote: quoteId, price: state.price }
   → { data: { _id: bookingId, … } }

3. PATCH /api/v1/booking/booking-for/{bookingId}
   body: { bookingFor: "installation" }
   → marks the booking as an install (not a survey)

4. (if payByCard) POST /api/v1/payment/{bookingId}
   → { data: { clientSecret, amount, currency } }  ← hand to Stripe.js

5. Render confirmation screen.
```

Any failure in step 1 or 2 surfaces as an error banner and the user can
retry. Failure in step 4 still lets them see the confirmation — the
booking is created, it just isn't paid yet.

---

## 6. What's still pending for you / the dev team

Concrete to-do list to bring everything in-spec with the Figma:

1. Register the unregistered modules in `app.module.ts` (1 line each).
2. Add `GET /address/:postcode` proxy (gap 1).
3. Add `GET /quote/price` server-side pricing endpoint (gap 2).
4. Add `GET /booking/slots` availability endpoint (gap 4).
5. Rename the typoed field names in `Quote` / DTO and update the front-end
   to match (gap 5).
6. Drop Stripe.js onto `quote.html` and wire a real card field (gap 7).
7. Upload the real boiler / controller / extra images via Swagger to make
   the cards look like the Figma.
8. Replace the emoji icons inside `option` cards with the exact SVG icons
   from Figma (the frontend's `optIcon()` map is the single place to
   edit).

Applying items 1–7 makes the design fully functional end-to-end.

---

## 7. Quick local-test recipe

```bash
# 1. Start the API
cd arronwh_backend
npm install
npm run start:dev          # boots on :3000 with /api/docs Swagger

# 2. Serve the static front-end
cd public
python3 -m http.server 8080   # or: npx serve .

# 3. Open http://localhost:8080/index.html in a browser and click
#    "Get your fixed price". Walk through the flow end-to-end.
```

If you see CORS errors you didn't see before, set
`API_BASE` in `quote.html` to match exactly how you're hitting the API
(e.g. `http://localhost:5000/api/v1` not `http://127.0.0.1:5000/api/v1`).

---

*End of report.*
