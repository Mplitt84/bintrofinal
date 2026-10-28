# AGENTS.md

Overview of the project structure for developers and AI agents working on this codebase.

## Project Overview

Bintro is a barcode scan-in/scan-out stock tracker and money manager for small beauty & wellness businesses and bars. Staff tap the big scan orb (camera) or use a hardware scanner, choose in or out, and the on-hand count updates immediately. Unknown barcodes can be prefilled from public product databases, a label photo read by AI, and an AI price estimate. The business name, type and contact details are editable in Settings (the original deployment was Shag Noir Salon). Supported types: hair, barber, nails, brows & lashes, tattoo & piercing, spa & massage, bar, other beauty & wellness. Tabs: Scan, Products, Restock (Below par → Build order), Calendar, Budget, Activity, plus Settings (gear in the header). The active tab lives in the URL hash (`#calendar`, `#restock`…; legacy `#below-par` / `#reorder` open Restock). Optional Square POS and QuickBooks Online connections. Tiered plans (Free / Plus / Premium) live in Settings → Account & billing.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Data | Netlify Database (Postgres) via Drizzle ORM |
| Language | TypeScript 5.9 (strict mode) |
| Deployment | Netlify |

## Directory Structure

```
├── db
│   ├── schema.ts   # Drizzle schema: products, movements, business_profile, team_members, expenses, budgets, integrations, product_categories, calendar_events, insight_reports, price_checks, account, billing_events
│   └── index.ts    # Drizzle client (Netlify Database adapter)
├── drizzle.config.ts        # Drizzle Kit config; migrations output to netlify/database/migrations
├── netlify/database/migrations/  # Auto-applied SQL migrations (never hand-edit an applied one)
├── netlify/functions/square-sales-sync.mts  # Scheduled (every 15 min): pulls completed Square sales as "out" movements
├── netlify/functions/insights-{weekly,monthly,fast-movers}.mts  # Scheduled insight emails: Mon 13:00 UTC, 1st 13:00 UTC, every 3 h
├── src
│   ├── components
│   │   ├── ui
│   │   │   ├── Sheet.tsx     # Bottom sheet (dialog on desktop) + Field / SheetActions
│   │   │   ├── Toast.tsx     # ToastProvider + useToast(message, onUndo?)
│   │   │   ├── Tips.tsx      # Gold light-bulb tips: header TipBulb, TipSheet (browse by theme), TipNudge pop-up every 10 min (TIP_INTERVAL_MINUTES), useTipPopups/setTipPopups device on-off
│   │   │   ├── AutoInput.tsx # Word-prediction input (dropdown, Tab accepts) + QuickChips one-tap choices
│   │   │   └── bits.tsx      # StatTile/StatGrid, Thumb, EmptyState, PageHead, timeAgo, centsToDollars
│   │   ├── insights
│   │   │   └── InsightsSheet.tsx   # Sales insights sheet (Moving fast / Best sellers / Slow movers / Prices), InsightsBanner, InsightPopup
│   │   ├── business
│   │   │   ├── BusinessContext.tsx  # BusinessProvider / useBusiness() → profile, business type, display name, saved categories
│   │   │   ├── CategorySetupSheet.tsx # Category pop-up (per-type suggestions grouped by tax line) + CategoryManager for Settings
│   │   │   ├── CalendarView.tsx     # Calendar tab: month grid, agenda, add to Google/Outlook/.ics, subscribe-feed sheet, quick-start events
│   │   │   ├── BudgetView.tsx       # Budget tab: rolling monthly spend vs budget, chart, expenses, receipt AI, QuickBooks push, CSV
│   │   │   ├── SettingsView.tsx     # Settings: business profile, look & feel, account & billing, team, scanner & Bluetooth, inventory import, Square/QuickBooks integrations
│   │   │   ├── AppearanceSettings.tsx # Settings → Look & feel: color palette picker (warm / cool / earthy / black & grey) + business tips on/off
│   │   │   ├── ScannerSettings.tsx  # Settings → Scanner & Bluetooth: Web Bluetooth pairing, OS pairing steps, scanner test, ask-who's-scanning mode
│   │   │   ├── AccountView.tsx      # Settings → Account & billing: plan summary, usage, plan picker, account details; Billing: card, pause, cancel, history
│   │   │   ├── PlanGate.tsx         # PlanGate / UpgradeCard: locks a view or control behind the plan that includes a feature
│   │   │   └── ImportView.tsx       # Settings → Import: upload CSV/PDF/photo of stock list or vendor invoice, review lines, AI prices, apply
│   │   └── inventory
│   │       ├── types.ts            # Shared Product / MovementRow / ActivityRow / Stats types
│   │       ├── ScanView.tsx        # Scan tab: in/out switch, scan orb, wand + BLE capture, unknown-barcode sheet, today stats
│   │       ├── StaffPicker.tsx     # Centered "Who's scanning?" name-tile pop-up + per-device ask mode (every scan | after idle)
│   │       ├── CameraScanner.tsx   # Full-screen html5-qrcode camera scanner (dynamically imported)
│   │       ├── ProductForm.tsx     # Shared add/edit form: word prediction, quick chips, barcode lookup, AI label photo, AI price check, talk-to-text
│   │       ├── VoiceInput.tsx      # SpeakDetails ("Speak product details" → AI fills the form) + per-field MicButton
│   │       ├── InventoryView.tsx   # Products tab: stats, search, filters, list, add/edit sheets
│   │       ├── ActivityView.tsx    # Activity tab: usage/receipts by period, brand and staff
│   │       ├── RestockView.tsx     # Restock tab: segmented "1 · Below par" / "2 · Build order"
│   │       ├── BelowParView.tsx    # Restock step 1: below-par list, email button, "Build vendor order"
│   │       └── PurchaseOrderView.tsx  # Restock step 2: vendor-grouped PO with CSV/print/email
│   ├── lib
│   │   ├── speech.ts              # useDictation(): browser speech recognition (Chrome/Edge/Safari; not Firefox)
│   │   ├── barcodes.ts            # checkUnknownScan: partial / mis-read barcode detection (length, GS1 check digit, UPC-E, fragment of a known code)
│   │   ├── palettes.ts            # Display palettes (theme token sets) + paletteStyle() CSS vars
│   │   ├── bluetooth-scanner.ts   # Web Bluetooth BLE-serial scanner connection (module singleton), code + state listeners
│   │   ├── plans.ts               # Plan tiers (Free / Plus / Premium), prices, limits, features, AccountSummary type
│   │   ├── bulk-import.ts         # Shared import types (ImportLine, ImportMode, price sources) and limits
│   │   ├── business-types.ts      # Business types (beauty & wellness + bar; retail/bookstore legacy), sizes/expense categories, profile type, month/day helpers
│   │   ├── insights.ts            # Insight thresholds, types (BestSeller, SlowMover, FastMover, PriceReminder, WebPriceResult), color detection
│   │   ├── calendar.ts            # Event kinds, repeat expansion, Google/Outlook add + subscribe links, .ics builder, estimated tax dates
│   │   ├── tips.ts                # Tip content (save money, plan ahead, sustainability, smarter stock), per-tab/per-type ordering
│   │   ├── images.ts              # shrinkImage: downscale photos to base64 JPEG before AI upload
│   │   ├── inventory-defaults.ts  # Shared constants/helpers: DEFAULT_REORDER_THRESHOLD, par math, initials
│   │   ├── palettes.ts            # Display palettes (theme token sets) + paletteStyle() CSS vars
│   │   ├── purchase-order.ts      # PO grouping, totals, CSV
│   │   └── tax-categories.ts      # Tax groups (Schedule C line, QuickBooks account, why), category suggestions per business type, guessTaxGroup
│   ├── server
│   │   ├── inventory.server.ts     # DB queries/mutations (server-only)
│   │   ├── account.server.ts       # Plan state, feature/limit checks, pause/cancel, Stripe checkout/portal/webhook sync (server-only)
│   │   ├── account.functions.ts    # getAccount, selectPlan, pausePlan, resumePlan, cancelSubscription, openPaymentPortal, getBillingHistory
│   │   ├── business.server.ts      # Profile, team, expenses, budgets, monthly spend overview (server-only)
│   │   ├── integrations.server.ts  # Square + QuickBooks OAuth, catalog import, sales sync, month push (server-only)
│   │   ├── import.server.ts        # Bulk import: CSV parsing, product matching, applying counts/receipts and price updates (server-only)
│   │   ├── import.functions.ts     # createServerFn wrappers: parseImport, estimateImportPrices, applyImport
│   │   ├── email.server.ts         # Restock / PO email via Resend/SendGrid, addressed from the business profile (server-only)
│   │   ├── product-lookup.server.ts  # Barcode lookup (Open *Facts, UPCitemdb, Open Library) + AI label/receipt reading and price suggestions (Netlify AI Gateway)
│   │   ├── inventory.functions.ts  # createServerFn wrappers callable from the client
│   │   ├── business.functions.ts   # createServerFn wrappers for profile/team/categories/budget/expenses/AI/integrations
│   │   ├── insights.server.ts      # computeInsights, runInsightReport (weekly | monthly | fast), price check records (server-only)
│   │   ├── insights.functions.ts   # getInsights, getInsightSummary, sendInsightReportNow, checkWebPrice, applyWebPrice, confirmPrices
│   │   ├── calendar.server.ts      # Calendar event CRUD + secret feed token (server-only)
│   │   └── calendar.functions.ts   # createServerFn wrappers: list/add/edit/remove events, getCalendarFeedPath
│   ├── routes
│   │   ├── __root.tsx   # Root layout, page title
│   │   ├── index.tsx    # Single-page app: header + staff/team sheet, bottom tab bar, loads data, renders tabs
│   │   ├── api/billing/{return,webhook}.ts  # Stripe Checkout return + Stripe webhook
│   │   ├── api/calendar/$feed.ts  # GET /api/calendar/<token>.ics: subscribable iCal feed
│   │   └── api/integrations/$provider/{connect,callback}.ts  # OAuth start + callback server routes (square | quickbooks)
│   └── styles.css       # Tailwind import + Bintro theme tokens and component classes
├── netlify.toml
├── package.json
└── tsconfig.json
```

## Data Model

- **products** — `barcode` (unique), `name`, `category`, `brand`, `size`, `qty`, `reorderThreshold` (defaults to `DEFAULT_REORDER_THRESHOLD`), `unitCostCents`, `retailPriceCents`, `vendor`, `imageUrl` (product photo from barcode lookup, empty string when none), `extraBarcodes` (text[] of additional barcodes / SKUs that also scan to the product — added under "Add another SKU" in the Edit product sheet; `findProductByBarcode` and import matching check them, and `assertBarcodeFree` keeps every code unique across products), `squareVariationId` (set by Square catalog import), `priceUpdatedAt` (set when cost/retail change or are confirmed; null = never, reminders fall back to `createdAt`).
- **movements** — an append-only log of every scan: `productId`, `type` (`in` | `out` | `adjust` | `receive`), `delta`, `staffName`, `staffInitials` (derived from the name, kept for older rows), timestamp. Used for the recent-activity feed and to support undo (undo reverses the delta and deletes the row). Deleting a product (Edit product sheet → Delete, tapped twice) also deletes its movements.
- **business_profile** — single row (`id = 1`): `name`, `businessType` (id from `BUSINESS_TYPES`), `email`, `phone`, `address`, `website`, `orderEmail`, `monthlyBudgetCents`, `weeklyReportEmail` / `monthlyReportEmail` / `fastMoverAlertEmail` (insight email switches, default on), `palette` (display palette id from `src/lib/palettes.ts`, default `burgundy-olive`), `calendarToken` (secret for the iCal feed URL; not part of the client profile type).
- **product_categories** — categories the business has added (`name` unique, matched case-insensitively on save) with a `taxGroup` id from `TAX_GROUPS`.
- **calendar_events** — `title`, `kind` (reorder | delivery | count | bill | tax | task), `date` YYYY-MM-DD, `startTime` HH:MM or '' for all day, `durationMinutes`, `repeat` (none | weekly | monthly | quarterly | yearly), `notes`, `staffName`.
- **team_members** — saved staff names (`name` unique).
- **expenses** — non-scanned spending: `spentOn` (YYYY-MM-DD), `amountCents`, `category`, `vendor`, `note`, `staffName`, `quickbooksId` (set once pushed).
- **budgets** — per-month budget overrides (`month` YYYY-MM); otherwise `monthlyBudgetCents` from the profile applies.
- **insight_reports** — one row per report period (`kind` weekly | monthly | fast, `periodKey` 2026-W40 / 2026-09 / 2026-09-29, unique together): AI `summary`, `payload` (counts, `emailedIds` for fast alerts), `emailedTo`, `emailedAt`.
- **price_checks** — each web price lookup for a product: cost, retail, `sourceName`, `sourceUrl`, `sourceType` (manufacturer | distributor | amazon | estimate), `note`.
- **account** — single row (`id = 1`): `plan` (free | plus | premium), `interval` (month | year), `status` (active | trialing | paused | canceled), `trialEndsAt`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `pausedUntil`, owner name / billing email, Stripe customer + subscription ids, cached card brand / last 4. Created on first read with a 30-day Premium trial.
- **billing_events** — plan changes, pauses, cancellations shown as billing history (Stripe invoices are merged in live).
- **integrations** — one row per provider (`square`, `quickbooks`): OAuth tokens, account id/name, `pendingState`, `lastSyncAt`, `meta` jsonb (cached account ids, pushed months).

## Key Concepts

### Scanning flow
`scanMovement` (in `inventory.functions.ts`) looks up the product by barcode. If found, it applies the delta and logs a movement. If not found, the client opens a sheet to either link the barcode to an existing product or create a new one; the new-product form auto-runs `lookupBarcodeDetails` and can prefill from a label photo via `readLabelPhoto` (Claude through the Netlify AI Gateway, only available on deployed sites). Scans come from the camera (`CameraScanner`), a hardware wand (global keydown capture in `ScanView`), or typed entry. Camera, wand and Bluetooth codes that match no product and fail `checkUnknownScan` (all-digit codes under 8 digits, part of a stocked barcode, or a bad GS1 check digit) play `errorBuzz()` and show "Scan again" instead of the new-product sheet, with a "That's the full code — use it" escape; 2–3 character wand bursts get the same buzz. Typed codes are never checked.

### Talk-to-text product entry
`ProductForm` has a "Speak product details" button (`SpeakDetails`): the browser's speech recognition transcribes, then `readSpokenProduct` (AI, Plus) pulls out brand, name, size, category, vendor, count, par, cost and retail — only what was said overrides the form. Without AI the transcript becomes the name. Name, brand, size and supplier also have a per-field mic (`MicButton`, no plan needed). Mics hide on browsers without speech recognition.

### Server functions
All database access goes through TanStack Start server functions in `src/server/inventory.functions.ts`, which call helpers in `inventory.server.ts`. Never import `db/index.ts` directly from client components.

### Below par / restock threshold
Stock status has one rule, `stockStatus()` in `src/lib/inventory-defaults.ts`: **Out** = 0 on hand (blank/missing or negative counts as 0), **Low** = 1+ but at or below the product's `reorderThreshold`, **In stock** = above it; a threshold of 0 means no reorder point, so the product is never Low. Use it everywhere instead of comparing `qty` by hand. Change `DEFAULT_REORDER_THRESHOLD` there rather than hardcoding a number, and
generate a migration if the column default itself changes. The Restock tab keeps no copy of its own: it derives its list with `selectBelowPar(products)` and the Products stat tiles with `stockStats(products)` from the same `products` state the Products tab shows. `findBelowParProducts` (restock email) and `computeStats` apply the same helpers to the products table. Scans and edits apply the returned product immediately (`applyProduct`), then `refresh()` re-reads; the app also refreshes every 30 s, on focus, and whenever Restock opens.

### Email
Restock lists and purchase orders send through Resend (`RESEND_API_KEY`) or SendGrid (`SENDGRID_API_KEY`). Resend sends from its shared address unless `RESTOCK_EMAIL_FROM` is set (retrying with the shared address if a custom sender is rejected); replies go to the business email. When no provider is set or sending fails, the server returns a `draft` and the app opens the device's mail app with it filled in (`src/lib/mail-draft.ts`).

### Business profile and types
`useBusiness()` exposes the profile, the matching `BusinessType` (categories, sizes, expense categories, item noun used in AI prompts and chips) and the display name. Never hardcode the business name — use `displayBusinessName` / `useBusiness().name`.

### Budget & expenses
Monthly spend = stock received (positive `in`/`receive` movements × current `unitCostCents`, grouped by vendor) + rows in `expenses`. `computeBudgetOverview` returns this per month; month windows are computed on the client (`monthRange`) so boundaries follow the device's local time.

### Bulk import (Settings → Import inventory)
Staff upload a CSV (any column layout — AI maps the columns, keyword guessing is the fallback), or a PDF / photo of a stock list, vendor invoice or receipt (read by Claude). Lines are matched to products by barcode, then brand + name, then close name overlap. Missing cost / retail prices are filled line by line by batched AI estimates (`estimateImportPrices`) and marked "AI estimate" until edited. Mode "Stock count" sets on-hand with `adjust` movements; "Delivery / receipt" adds units with `receive` movements (so it counts toward Budget) and the file's unit cost becomes the product's cost. New products without a usable barcode get a `BT-XXXXXX` SKU. Movement notes read `Import: <vendor · file>`. Mode "Price update" (auto-picked when a file has prices but no quantities) only changes cost / retail on matched products, using a looser name match; unmatched lines are skipped and stock is untouched.

### Sales insights, reports and price checks
`computeInsights()` works live from `out` movements. Each item is tagged `useKind` `sold` or `used` from its category's tax group (`SOLD_TAX_GROUPS`: resale, beverage, food; no category → sold only if it has a retail price), so backbar/service supplies are never called sales. Weekly top items (last 7 days vs the week before) carry expected profit (units × (retail − cost)) for sold items and product cost for used items, with sold/used totals in `insights.week`; slow movers (in stock, ≥30 days old, used ≤1× in 30 days, grouped color / retail / other), fast movers (≥3 a week and out within 14 days or selling 1.5× the usual rate) with a bulk order covering 30 days plus par priced at the current `unitCostCents`, and price reminders (older than 90 days or no cost). Thresholds live in `src/lib/insights.ts`. `runInsightReport(kind)` writes an AI summary, saves it to `insight_reports` and emails it (weekly and monthly once per period; fast alerts skip products alerted in the last 3 days). The recipient is env `INSIGHTS_EMAIL_TO`, else the profile email, else the order email; period keys use env `BUSINESS_TIMEZONE` (default America/New_York). In the app, `InsightPopup` shows each new fast alert, the week's best sellers and the month's slow movers once per device (`bintro-insights-*` localStorage keys), and banners on Activity and Restock open `InsightsSheet`. `findWebPrice` uses Claude with the Anthropic web search tool to find prices on manufacturer, authorized distributor or Amazon listings, blocks third-party resale sites (`RESALE_DOMAINS`), and falls back to a labelled AI estimate when search isn't available.

### Categories and tax groups
Product category chips show only categories the business has saved (`product_categories`). Each category is filed under a tax group in `src/lib/tax-categories.ts` (e.g. retail products for resale → cost of goods sold, Sch. C Part III; service supplies → Sch. C line 22). Each group carries a plain-language "why", the Schedule C line and the QuickBooks account so an accountant can read the list. `CATEGORY_SUGGESTIONS` lists what most businesses of each type use; `CategorySetupSheet` offers them as a pop-up (first focus on an empty Category field, after changing business type, or from Settings → Categories). `findBusinessContext()` swaps the type's default categories for the saved ones, so AI prompts use the business's own list. Budget rolls stock spend up by tax line and the CSV carries Tax group / Tax line columns.

### Calendar
Business events (reorders, deliveries, counts, bills, tax dates, tasks) live in `calendar_events`. Each event can be added to Google Calendar, Outlook.com, Outlook (Microsoft 365) or downloaded as .ics. The Sync sheet gives subscribe links to the live feed `/api/calendar/<calendarToken>.ics` (the token can be reset). The feed writes timed events as floating local times. No OAuth is involved.

### Plans & billing
Tiers live in `src/lib/plans.ts` (prices, product/team limits, `Feature` ids). Free: scanning, products (≤150), 2 team members, below par, activity. Plus: unlimited products, 10 team, vendor orders, calendar, bulk import, AI (label photo, price checks), sales reports, Square. Premium: + Budget & expenses, receipt AI, QuickBooks, CRM (coming soon), unlimited team. `effectivePlan` is Free while paused. Client: `useBusiness().can(feature)` and `<PlanGate feature>`; server: `assertFeature` / `hasFeature` / `assertProductRoom` / `assertTeamRoom` in `account.server.ts` (also checked by scheduled functions and the integration connect route). Payments use Stripe over REST when `STRIPE_SECRET_KEY` and `STRIPE_PRICE_{PLUS,PREMIUM}_{MONTHLY,YEARLY}` are set (webhook at `/api/billing/webhook`, secret `STRIPE_WEBHOOK_SECRET`); without them the app is in pilot mode and plan changes apply with no charge. Pause = 1–3 months (Stripe `pause_collection`); cancel = at period end (trials end immediately).

### Integrations
Env vars: `SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`, `SQUARE_ENVIRONMENT` (`sandbox` optional); `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_ENVIRONMENT` (`sandbox` optional). Redirect URLs are `<site>/api/integrations/{square|quickbooks}/callback`. Square: catalog import (matches by variation id, then UPC/SKU) and sales sync (completed orders → "out" movements by "Square POS", every 15 min). QuickBooks: pushes a month's expenses as Purchases, and stock spend per vendor once the month has ended.

### Staff attribution
Before each scan (orb tap, typed barcode, wand or Bluetooth scan) the Scan tab opens `StaffPicker`, a centered pop-up with a tile per saved team member (`askStaff()` in `index.tsx` returns a promise with the picked name). Settings → Scanner & Bluetooth can switch a device to ask only after 10 minutes without a scan (`shagnoir-ask-staff`). The header pill opens the same picker. The name is persisted to `localStorage` and passed down to
each view, which forwards it to the server functions as `staffName`; new names join the team.

### Bluetooth scanners
Keyboard (HID) scanners pair in the OS Bluetooth settings (Settings shows the steps per device) and are caught by the Scan tab's keydown capture. Scanners with a BLE serial service can connect from Settings via Web Bluetooth (Chrome/Edge; not Safari/iOS) — `src/lib/bluetooth-scanner.ts` keeps the connection alive across tabs, auto-reconnects, and `ScanView` subscribes with `onBluetoothCode`.

### Styling
Bintro's default theme is burgundy, olive and cream (`burgundy-olive`; the original royal blue & gold is the `royal` palette). Tokens keep their original names (`--color-page`, `surface`, `ink`, `line`, `action` = burgundy, `royal`/`royal-2` = deep burgundies, `gold`/`gold-bright`/`gold-ink`/`gold-tint` = olive accents, `good`/`warn`/`bad` + `-tint`) and live under `@theme` in `src/styles.css`, along with shared classes: `.brand-tile`, `.royal-rule`, `.tip-bulb`, `.tip-card`, `.btn` (`-primary`/`-gold`/`-tonal`/`-text`/`-danger`/`-sm`), `.chip` (uses `aria-pressed`), `.field-input`, `.orb`, `.skel`. The business's palette (Settings → Look & feel, `profile.palette`) overrides these tokens at runtime via `paletteStyle()` on `<html>` and the app wrapper, so never hardcode theme hex/rgba values — use the tokens or `color-mix()` on them. Use bottom sheets (`Sheet`) for dialogs and `useToast` for confirmations. Gold is for accents and tips (use `gold-ink` for gold text on white); the action color is for actions. New tips go in `src/lib/tips.ts`. localStorage keys keep their `shagnoir-` prefix so existing devices keep their data.

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
```

## Conventions

- Components: PascalCase, one feature area per subdirectory under `src/components/`.
- Server-only helpers end in `.server.ts`; client-safe RPC wrappers end in `.functions.ts`.
- Schema changes always go through `db/schema.ts` + `npx drizzle-kit generate --name ...` — never hand-write `CREATE TABLE` SQL.
- Money is stored as integer cents (`unitCostCents`) and formatted for display with `centsToDollars`.
