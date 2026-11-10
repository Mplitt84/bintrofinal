# AGENTS.md

Overview of the project structure for developers and AI agents working on this codebase.

## Project Overview

Bintro is a barcode scan-in/scan-out stock tracker and money manager for small beauty & wellness businesses and bars. Staff tap the big scan orb (camera) or use a hardware scanner, choose in or out, and the on-hand count updates immediately. Unknown barcodes can be prefilled from public product databases, a label photo read by AI, and an AI price estimate. The business name, type and contact details are editable in Settings (the original deployment was Shag Noir Salon). Supported types: hair, barber, nails, brows & lashes, tattoo & piercing, spa & massage, bar, other beauty & wellness. Tabs: Scan, Products, Restock (Below par → Build order → Deliveries), Calendar, Budget, Activity, plus Settings (gear in the header). The active tab lives in the URL hash (`#calendar`, `#restock`…; legacy `#below-par` / `#reorder` open Restock). Optional Square POS and QuickBooks Online connections. Tiered plans (Free / Plus / Premium) live in Settings → Account & billing.

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
│   ├── schema.ts   # Drizzle schema: products, movements, business_profile, team_members, expenses, budgets, integrations, square_outbox, product_categories, calendar_events, insight_reports, price_checks, account, billing_events, par_changes, stock_counts, stock_count_lines, connection_requests, integration_logs, app_users, app_sessions
│   └── index.ts    # Drizzle client (Netlify Database adapter)
├── drizzle.config.ts        # Drizzle Kit config; migrations output to netlify/database/migrations
├── netlify/database/migrations/  # Auto-applied SQL migrations (never hand-edit an applied one)
├── netlify/functions/square-sales-sync.mts  # Scheduled (every 15 min): pulls completed Square sales as "out" movements, then retries queued Bintro → Square stock changes
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
│   │   │   ├── SetupCheck.tsx       # Settings → Setup check: AI ping, Stripe key/prices (read-only), email provider + test email, Square/QuickBooks keys, pilot flag
│   │   │   ├── PlanGate.tsx         # PlanGate / UpgradeCard: locks a view or control behind the plan that includes a feature
│   │   │   └── ImportView.tsx       # Settings → Import: upload CSV/PDF/photo of stock list or vendor invoice, review lines, AI prices, apply
│   │   └── inventory
│   │       ├── types.ts            # Shared Product / MovementRow / ActivityRow / Stats types
│   │       ├── ScanView.tsx        # Scan tab: in/out switch, scan orb, wand + BLE capture, unknown-barcode sheet
│   │       ├── ScanOverview.tsx    # Scan tab below the scanner: "At a glance" (Today/Week/Month/Quarter tiles, activity chart, top items) + labeled Recent with filters
│   │       ├── StaffPicker.tsx     # Centered "Who's scanning?" name-tile pop-up + per-device ask mode (every scan | after idle)
│   │       ├── CameraScanner.tsx   # Full-screen html5-qrcode camera scanner (dynamically imported); reader sits in a sized wrapper because the library forces position: relative on it
│   │       ├── PhotoStockSheet.tsx # "Snap & log" (Plus): photo → device barcode decode + AI read → confirm product, in/out, qty → logged
│   │       ├── ProductForm.tsx     # Shared add/edit form: word prediction, quick chips, barcode lookup, AI label photo, AI price check, talk-to-text
│   │       ├── MergePanel.tsx      # Edit sheet "Duplicate? Merge into another product": closest name matches first, then mergeProducts
│   │       ├── VoiceInput.tsx      # SpeakDetails ("Speak product details" → AI fills the form) + per-field MicButton
│   │       ├── InventoryView.tsx   # Products tab: stats, round tool buttons, search, filters, select mode + bulk bar, list, add/edit sheets
│   │       ├── CheckProductSheet.tsx # Check mode: what a scanned SKU is + verify its count (one-line "Spot check" count)
│   │       ├── CountDetailSheet.tsx # One count's changes + "Undo this count" (from Recent or Count history)
│   │       ├── CountReconcileSheet.tsx # Count & reconcile: choose scope (blind), count, review differences with reasons/recount, approve, history
│   │       ├── BulkEditSheet.tsx   # Bulk edit for selected products (category, vendor, brand, par, order up to, case pack, prices, expiry)
│   │       ├── ActivityView.tsx    # Activity tab: usage/receipts by period, brand and staff
│   │       ├── RestockView.tsx     # Restock tab: segmented "1 · Below par" / "2 · Build order"
│   │       ├── BelowParView.tsx    # Restock step 1: below-par list, email button, "Build vendor order"
│   │       ├── PurchaseOrderView.tsx  # Restock step 2: vendor-grouped PO with CSV/print/email; saves what went out as open orders
│   │       ├── TidyTools.tsx       # Data clean-up: CountSheet (count stock / fix negatives), DuplicatesSheet, SmartParSheet, CategoryCleanup
│   │       ├── MissingCostsSheet.tsx # Missing costs: list of products with no cost, type it in or Find with AI per item / for all
│   │       ├── DeliveriesView.tsx  # Restock step 3: open orders, check-in, vendor accuracy, recently received
│   │       └── ReceiveDeliverySheet.tsx # Check a delivery in: invoice/packing-slip photo or PDF (AI) or by hand against a saved order
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
│   │   ├── tidy.ts                # ParSuggestion / CategoryGroup / DuplicateGroup types (client-safe)
│   │   ├── legal.ts               # LEGAL details (company, email, address, venue, effective date) + TERMS / PRIVACY / EULA text; [brackets] = draft banner
│   │   ├── counts.ts              # COUNT_REASONS, needsRecount, lastCountedLabel, count history types (client-safe)
│   │   ├── sales-report.ts        # SALES_REPORT_APPS, sales report line/result types, salesReportNote (client-safe)
│   │   ├── orders.ts              # Saved order / delivery / vendor score types (client-safe)
│   │   └── tax-categories.ts      # Tax groups (Schedule C line, QuickBooks account, why), category suggestions per business type, guessTaxGroup
│   ├── server
│   │   ├── inventory.server.ts     # DB queries/mutations (server-only)
│   │   ├── account.server.ts       # Plan state, feature/limit checks, pause/cancel, Stripe checkout/portal/webhook sync (server-only)
│   │   ├── account.functions.ts    # getAccount, selectPlan, pausePlan, resumePlan, cancelSubscription, openPaymentPortal, getBillingHistory
│   │   ├── business.server.ts      # Profile, team, expenses, budgets, monthly spend overview (server-only)
│   │   ├── integrations.server.ts  # Square + QuickBooks OAuth, catalog import, sales sync, month push (server-only)
│   │   ├── import.server.ts        # Bulk import: CSV parsing, product matching, applying counts/receipts and price updates (server-only)
│   │   ├── import.functions.ts     # createServerFn wrappers: parseImport, estimateImportPrices, applyImport, applyReceiptPrices, parseSalesReport, logSalesReport
│   │   ├── tidy.server.ts          # smartPars, categoryGroups/mergeCategoryNames, duplicateGroups, applyCounts (server-only)
│   │   ├── tidy.functions.ts       # getSmartPars, setPars, getCategoryGroups, mergeCategories, getDuplicateGroups, saveCounts
│   │   ├── orders.server.ts        # Saved purchase orders, delivery check-in (reuses applyImportLines in receipt mode), vendor scores (server-only)
│   │   ├── orders.functions.ts     # saveSentOrder, getOrders, cancelSavedOrder, receiveDeliveryFn
│   │   ├── email.server.ts         # Restock / PO email via Resend/SendGrid, addressed from the business profile (server-only)
│   │   ├── product-lookup.server.ts  # Barcode lookup (Open *Facts, UPCitemdb, Open Library) + AI label/receipt reading and price suggestions (Netlify AI Gateway)
│   │   ├── inventory.functions.ts  # createServerFn wrappers callable from the client
│   │   ├── business.functions.ts   # createServerFn wrappers for profile/team/categories/budget/expenses/AI/integrations
│   │   ├── insights.server.ts      # computeInsights, runInsightReport (weekly | monthly | fast), price check records (server-only)
│   │   ├── insights.functions.ts   # getInsights, getInsightSummary, sendInsightReportNow, checkWebPrice, applyWebPrice, confirmPrices
│   │   ├── counts.server.ts        # approveCount (adjustments with reasons, history, last counted), recentCounts, countLines (server-only)
│   │   ├── counts.functions.ts     # approveStockCount, getCountHistory, getCountLines
│   │   ├── setup.functions.ts      # runSetupCheck (never returns key values), sendSetupTestEmail (to the business's own address)
│   │   ├── calendar.server.ts      # Calendar event CRUD + secret feed token (server-only)
│   │   └── calendar.functions.ts   # createServerFn wrappers: list/add/edit/remove events, getCalendarFeedPath
│   ├── routes
│   │   ├── __root.tsx   # Root layout, page title
│   │   ├── index.tsx    # Single-page app: header + staff/team sheet, bottom tab bar, loads data, renders tabs
│   │   ├── {terms,privacy,eula}.tsx  # Public legal pages (no login) rendered by components/legal/LegalPage from lib/legal.ts
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
- **movements** — an append-only log of every scan: `productId`, `type` (`in` | `out` | `adjust` | `receive`), `delta`, `staffName`, `staffInitials` (derived from the name, kept for older rows), timestamp. Used for the recent-activity feed and to support undo (undo reverses the delta and deletes the row). Deleting a product (Edit product sheet → Delete, tapped twice) also deletes its movements. Merging (Edit product sheet → "Duplicate? Merge…", `mergeProductsInto`) folds a duplicate into the product it really is: the kept product keeps its count and details, fills blanks from the duplicate, takes its barcodes as `extraBarcodes` (synthetic `SQ-` codes dropped) and its `squareVariationId`, and inherits its movements except "Starting count from Square" adjusts (so stock isn't counted twice); the duplicate is deleted and, if the kept product is linked to Square, its count is sent to Square.
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
- **integrations** — one row per provider (`square`, `quickbooks`): OAuth tokens, account id/name, `pendingState`, `lastSyncAt`, `meta` jsonb (granted Square `scopes`, Square `locationId`, cached account ids, pushed months).
- **purchase_orders** / **purchase_order_lines** — orders saved when Build order is emailed, printed or downloaded (one per vendor via `vendorGroupLabel`): `vendor`, `status` (open | partial | received | canceled), `note`, `staffName`, `sentVia`, `receivedAt`; lines snapshot the product (`productId`, name, brand, size, barcode) with `qtyOrdered`, `qtyReceived`, `unitCostCents` (cost when ordered) and `receivedCostCents` (invoice cost).
- **square_outbox** — Bintro stock changes queued for Square: `productId`, `variationId`, `kind` (`delta` = +/- units | `count` = set on-hand), `quantity`, `movementId` (for undo), `status` (pending | sent | error), `error`, `attempts`, `occurredAt`, `sentAt`.

## Key Concepts

### Scanning flow
`scanMovement` (in `inventory.functions.ts`) looks up the product by barcode. If found, it applies the delta and logs a movement. If not found, the client opens a sheet to either link the barcode to an existing product (`linkBarcodeToProduct` adds it as an extra SKU so the product's own barcode keeps working — it becomes the main barcode only when the product has none or a `BT-`/`SQ-` placeholder; clashes return a message instead of throwing) or create a new one; the Edit product form changes a main barcode with `setProductBarcode`; the new-barcode sheet passes `autoOfferCopy={false}` to `ProductForm` so the "Copy a previous entry?" pop-up doesn't open over (and block) the New product / Link chips — the Copy button stays on the form; the new-product form auto-runs `lookupBarcodeDetails` and can prefill from a label photo via `readLabelPhoto` (Claude through the Netlify AI Gateway, only available on deployed sites). Scans come from the camera (`CameraScanner`), a hardware wand (global keydown capture in `ScanView`), or typed entry. Camera, wand and Bluetooth codes that match no product and fail `checkUnknownScan` (all-digit codes under 8 digits, part of a stocked barcode, or a bad GS1 check digit) play `errorBuzz()` and show "Scan again" instead of the new-product sheet, with a "That's the full code — use it" escape; 2–3 character wand bursts get the same buzz. Typed codes are never checked.

### Check mode (verify a SKU / spot-count)
The Scan tab's switch has three modes: **Scan out**, **Scan in** and **Check** (`Mode = 'in' | 'out' | 'check'`). Check never changes stock and doesn't ask who's scanning up front: camera, wand, Bluetooth or typed codes go through `lookupBarcode`; a match opens `CheckProductSheet` (photo, "SKU matches <code>" incl. extra SKUs, last counted) with the details **editable in place**: name, brand, size, category (saved categories), vendor, reorder at, order up to, cost, retail — "Save details" (`updateProduct`, never qty) appears when something changed and also runs before a count is saved. **Verify the count**: "Count matches · N" or type/step the shelf number, pick a reason from the shorter `CHECK_REASONS` (Recount, Damaged, Missing SKU, Theft; full counts keep `COUNT_REASONS`), "Save count". Saving asks who, then `approveStockCount` with scope "Spot check" and one line, so it lands in Count history, stamps last counted, adjusts stock with a reason when different (Square follows) and can be undone like any count. An unknown code in Check opens the new-barcode sheet ("Save and check"). The qty stepper hides in Check; the orb uses `orb-check`.

### Scan page overview
Below the scanner, `ScanOverview` shows **At a glance** for Today / Week / Month / Quarter (chip remembered per device in `bintro.overviewPeriod`): Retail sold (retail price × units of "sold" products), Product used (cost of "used" products), Received (cost), and a neutral To reorder tile (taps to Restock; shows stock-on-hand value). Each compares with the same stretch of the previous period (`overviewWindows`, `changeLabel`; only sales get green/red). Sold vs used uses the same tax-group rule as insights (`useKindFor`, exported from `insights.server.ts`). Count corrections (`adjust` movements) are never counted as sales or use; they're summarised in one line. `getOverview` → `computeOverview` (`overview.server.ts`) takes local-time windows and chart bucket edges from the client (`src/lib/overview.ts`). Then a small activity chart (sold + used units per bucket, received as a marker), Top items, and **Recent**: every row carries a label from `movementKind` (Sold / Square sale / Used / Received / Count) with filter chips (All / Sold & used / Received / Counts); count rows have no single-row undo; their › opens `CountDetailSheet` (the count's changes and reasons) with **Undo this count** (two taps) → `undoStockCount` → `undoCount`: marks `stock_counts.undoneAt/undoneBy` (once only), adds an `adjust` movement `Undo count #id` reversing each changed product's diff (relative, so later scans stay; Square follows), and resets `lastCountedAt/By` to the latest other count that isn't undone. Count history shows an "Undone" tag and the same "Undo this count…" link. `countIdFromNote` reads the count id from movement notes.

### Quick stock photo
For staff in a hurry, the Scan tab's "Snap & log: photo the SKU or label" button (a Plus feature, listed in `plans.ts` highlights and the `ai` blurb) (also offered inside the camera scanner) opens the phone camera via a file input (`capture="environment"`; it must open straight from the tap, so "Who's scanning?" is asked after the photo). `PhotoStockSheet` decodes any barcode on the device first (BarcodeDetector, else html5-qrcode `scanFile`), then `readStockPhotoFn` (AI, Plus) reads the code and label. The photo must show the whole SKU / barcode number or the full front label (brand + product name) — anything less returns a "Retake" message. Matches: exact code first, else up to 5 products by brand + name word overlap (+ same size). Staff confirm Adding to inventory / Scanning out, the quantity and the product (or add it as a new product, pre-filled from the photo, with a `BT-` SKU when there's no code), then `recordProductMovement` logs it with the note `Photo: SKU / barcode` or `Photo: full label`; undo works from the toast. The photo itself isn't stored.

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

### Orders and deliveries (Restock step 3)
Build order saves what goes out (`saveSentOrder`, once per distinct set of lines) as open orders. Below par shows "N on order" from `getOrders().onOrder` so nothing is ordered twice. Deliveries lists open orders; "Check in delivery" (or "Receive a delivery" with no order, also reachable from the Scan tab's "Got a delivery?" button, which sets `autoReceive`) opens `ReceiveDeliverySheet`: a photo or PDF of the invoice / packing slip goes through `parseImport` (AI, Plus) and is laid over the order's lines (matches by product id; extras flagged "Not on the order" / "New product"), or staff mark "Everything arrived as ordered" / count by hand. Flags: Short N, N extra, Cost up/down. `receiveDelivery` applies the lines with `applyImportLines` in receipt mode (receive movements → Budget, Square; invoice costs update products; blank cost keeps the current one), then adds to each order line's `qtyReceived`, sets `receivedCostCents`, and marks the order received or partial (shortages stay on order). Vendor accuracy (`scoreVendors`): fill rate of ordered units, short lines, price changes vs ordered cost, average days to arrive, worst first.

### Sales reports from other booking apps
For booking apps Bintro can't connect to (Fresha, GlossGenius, Mangomint, Booksy, and any app before its API connection exists), the Scan tab's "Sold retail in another booking app? Upload the sales report" button opens `SalesReportSheet` (Plus, feature `import`). Staff pick the app (remembered per device in `bintro.salesReportApp`) and upload the app's product sales export: CSV (columns found by `salesColumns` — name/barcode plus a "sold"/qty column — with AI column mapping as the fallback, so CSVs work without AI), or a PDF / photo (AI, `extractImportDocument`). `parseSalesReportFile` drops totals/tax/tip rows, matches lines with `findMatch` and adds up lines for the same product; unmatched lines (often services) start unticked with a "Which product is this?" picker. Confirming asks "Who's scanning?" and `applySalesReport` logs one `out` movement per product with the note `Sales report: <app> · <period>` (`salesReportNote`); the same note already in movements is refused as a duplicate unless staff tap "Log it again anyway". Square sales are not uploaded here (they sync on their own).

### Keeping the data trustworthy
- **Reorder at / Order up to / Case pack**: each product has `reorderThreshold` (Reorder at — when it's Low), `maxQty` (Order up to — the most worth having on the shelf; 0 = order back to par) and `packSize` (units per case; 1 = singles). `suggestedOrderQty(product, onOrder)` in `inventory-defaults.ts` fills back to `orderUpTo()` minus open orders, in whole cases rounded *down* (at least one case) so the shelf never passes Order up to; Below par, Build order (± steps by a case), the restock email and the list totals all use it. All three are editable in the product form.
- **Smart par** (Products chip, and Restock → Below par → Smart par): pace = units out per day, 65% last 30 days + 35% last 90; Reorder at = pace × the vendor's measured delivery days (Deliveries, else 7) + safety stock (1.65 × the weekly standard deviation × √(lead/7) with 4+ weeks of history, else half the lead time's use); Order up to = Reorder at + pace × the business's order cycle (`business_profile.orderEveryDays`, picked in the sheet: twice a week / weekly / every 2 weeks / monthly), rounded up to whole cases. Untouched for 90 days (and older than 30 days) → both 0, so it stops alerting. The sheet also lists overstock (on hand > 1.5 × Order up to) with days of stock and the cash tied up. Suggestions only; staff tick and apply (`setPars` writes par and max). Each apply is recorded in `par_changes` (old and new par/max per product, one `batchId`, history written before the updates) and can be undone from the toast or the "Last applied … Undo" bar at the top of the sheet (`undoPars` → `undoParChange`, which restores the old levels and stamps `undoneAt`). Smart par never touches on-hand counts.
- **Count & reconcile** (Products round button; "Fix negatives" opens it scoped to negative counts): `CountReconcileSheet` in four steps. 1 Choose: everything, a category, a vendor, below par, negatives, or pick-as-you-go, plus **Blind count** (on by default; hides Bintro's number so staff count what's really there). 2 Count: scan (each scan adds 1) or search; progress "N of M"; grouped by category; each row shows "Last counted … by …"; the draft is kept on the device (`bintro.countDraft`) so a count can be paused and resumed. 3 Review: only differences, sorted by $ impact, with Match / Over / Short / Net value tiles; uncounted items are left alone unless "mark as 0" is ticked; differences flagged by `needsRecount` (3+ units, $25+, or 25%+ and 2+ units) must be recounted or confirmed; every difference needs a reason (`COUNT_REASONS`, with "Reason for the rest…"). 4 Approve → `approveStockCount` → `approveCount` (Square sales pulled first, one `adjust` movement per change with note `Count #id · reason`, Square follows; saves `stock_counts` + `stock_count_lines`; stamps `products.lastCountedAt` / `lastCountedBy` on every counted product). Count history lists each count (date, who, scope, blind, counted/adjusted, +over/−short, net $) and opens its lines with reasons. The product form shows "Last counted … by …". No plan needed.
- **Missing costs** (Products orange round button, `MissingCostsSheet`): a searchable list of every product with no cost. Tap an item to type **Your cost** / **Sells for** and Save (`applyWebPrice` without a checkId), or **Find with AI** for that item (`checkWebPrice`; the result fills the fields with its source and link, saved only when staff tap Save — the AI check id is kept only if they save the AI numbers unchanged). **Find all (or these N) with AI** runs the price check two at a time over the shown items and saves what it finds (retail only where none is set); stops early if the AI service isn't answering. Saved items drop off the list right away.
- **Find duplicates** (Products chips): same name + size + category spelling (`categoryKey`); retail/backbar copies differ in size or category so they're never offered; merging uses `mergeProducts`.
- **Tidy up categories** (Settings → Categories): spellings with the same `categoryKey` (lower-cased words, sorted, joined: "Floor bar back" = "Floor Back bar") are offered as one; merging renames products and keeps the chosen spelling's tax group.

### Bulk edit (Products)
The **Select** chip on Products turns on select mode: rows get checkboxes (tapping a row toggles it), and a bar above the tab bar shows the count, **Select all N** (everything in the current search / filter / category) or Clear, **Edit** and **Delete**. Edit opens `BulkEditSheet`: category, vendor, brand (with suggestions from the selection), Reorder at, Order up to, Case pack, cost, retail and expiry (18/24/36 months, No expiration, Clear expiry, or a date). Blank fields are left alone and counts are never touched; it calls `bulkUpdateProducts` (same `updateProductFields` path, 10 at a time). Delete is two-tap and calls `bulkDeleteProducts` (each product and its history, like a single delete).

### Expiry
Each product has `expiresOn`: "" (not set), "none" (doesn't expire) or a YYYY-MM-DD date. The product form offers 18 / 24 / 36 months (counted from today, `monthsFromToday`), No expiration, or a typed date; helpers live in `src/lib/expiry.ts`. Product rows show an amber "Expires in Nd" tag within `EXPIRY_WARN_DAYS` (60) and red "Expired" after, and Products gets an "Expiring N" filter chip when any are due.

### Categories clean-up
Settings → Categories shows Tidy up categories (same spelling, different case/order), then **All categories in use** (`CategoryList`, `getCategoryList`): every category with its product count and a Delete that first moves its products to a chosen category (or none) via `deleteCategory` → `deleteCategoryName` (reuses `mergeCategoryNames`), then removes the saved category.

### Round action buttons
`src/components/ui/ToolButton.tsx` (`ToolButton`, `ToolRow`): a bold colored circle with an icon, label underneath and an optional count badge. Colors are **fixed brand colors** (`TOOL_TONES`), the one deliberate exception to "use palette tokens": they never change with the business's palette, so each action keeps the same color everywhere and staff learn it by sight. Pick the tone by *action*, not screen: garnet = main action (Count & reconcile, Snap & log, Build order), yellow = Smart par (dark icon), royal blue = anything that emails (Email list, Email order), green = deliveries (Check in delivery, Receive delivery), red = Fix negatives, orange = Missing costs, purple = Duplicates, teal = files (Sales report, Download CSV), charcoal = utilities (Refresh, Print). A new action reuses the tone of the closest existing one.

### Sales insights, reports and price checks
`computeInsights()` works live from `out` movements. Each item is tagged `useKind` `sold` or `used` from its category's tax group (`SOLD_TAX_GROUPS`: resale, beverage, food; no category → sold only if it has a retail price), so backbar/service supplies are never called sales. Weekly top items (last 7 days vs the week before) carry expected profit (units × (retail − cost)) for sold items and product cost for used items, with sold/used totals in `insights.week`; slow movers (in stock, ≥30 days old, used ≤1× in 30 days, grouped color / retail / other), fast movers (≥3 a week and out within 14 days or selling 1.5× the usual rate) with a bulk order covering 30 days plus par priced at the current `unitCostCents`, and price reminders (older than 90 days or no cost). Thresholds live in `src/lib/insights.ts`. `runInsightReport(kind)` writes an AI summary, saves it to `insight_reports` and emails it (weekly and monthly once per period; fast alerts skip products alerted in the last 3 days). The recipient is env `INSIGHTS_EMAIL_TO`, else the profile email, else the order email; period keys use env `BUSINESS_TIMEZONE` (default America/New_York). In the app, `InsightPopup` shows each new fast alert, the week's best sellers and the month's slow movers once per device (`bintro-insights-*` localStorage keys), and banners on Activity and Restock open `InsightsSheet`. `findWebPrice` (the product form's single "AI price check" button) uses Claude with the Anthropic web search tool and looks, in order, at the product's own supplier (`vendor`), the professional distributors for the business type (`PRO_DISTRIBUTORS`: e.g. SalonCentric, CosmoProf, Salon Service Group, Armstrong McCall for salons; Kingpin, Painful Pleasures, Worldwide Tattoo Supply for tattoo), then the brand's site. Resale sites (`RESALE_DOMAINS`) are always blocked; consumer marketplaces (`MARKETPLACES`: Amazon, Walmart, Target) are blocked unless the product's vendor is that marketplace. Cost = the pro price; retail = MSRP. Falls back to a labelled AI estimate when nothing is found.

### AI calls
Every Claude call goes through `postToClaude` in `product-lookup.server.ts`: it tries each route the deploy has (`BINTRO_ANTHROPIC_KEY` — the owner's own Anthropic key, always sent straight to api.anthropic.com, the fix when Netlify's gateway answers 503 "AI Gateway service is not available" — then `ANTHROPIC_API_KEY` + optional `ANTHROPIC_BASE_URL` — a key with no base URL goes straight to api.anthropic.com — then Netlify's universal `NETLIFY_AI_GATEWAY_*`), retries 408/429/5xx/529 once per route, then a backup model (`BACKUP_MODEL`). Failures are logged as `AI <tag> via <route> (<model>) failed`.

### Receipt prices
Product costs follow receipts and invoices with no typing: delivery check-in and Import (receipt mode) write invoice unit costs to products, and every Budget receipt photo also runs `applyReceiptPrices` (prices-only import of the matched line items, stock untouched).

### Categories and tax groups
Product category chips show only categories the business has saved (`product_categories`). Each category is filed under a tax group in `src/lib/tax-categories.ts` (e.g. retail products for resale → cost of goods sold, Sch. C Part III; service supplies → Sch. C line 22). Each group carries a plain-language "why", the Schedule C line and the QuickBooks account so an accountant can read the list. `taxKind()` tags each group COGS or Expense in the UI. A category typed in the product form isn't saved until staff pick its tax group (pre-selected with `guessTaxGroup`). `CATEGORY_SUGGESTIONS` lists what most businesses of each type use; `CategorySetupSheet` offers them as a pop-up (first focus on an empty Category field, after changing business type, or from Settings → Categories). `findBusinessContext()` swaps the type's default categories for the saved ones, so AI prompts use the business's own list. Budget rolls stock spend up by tax line and the CSV carries Tax group / Tax line columns.

### Calendar
Business events (reorders, deliveries, counts, bills, tax dates, tasks) live in `calendar_events`. Each event can be added to Google Calendar, Outlook.com, Outlook (Microsoft 365) or downloaded as .ics. The Sync sheet gives subscribe links to the live feed `/api/calendar/<calendarToken>.ics` (the token can be reset). The feed writes timed events as floating local times. No OAuth is involved.

### Plans & billing
Tiers live in `src/lib/plans.ts` (prices, product/team limits, `Feature` ids). Free: scanning, products (≤150), 2 team members, below par, activity. Plus ($49/mo or $490/yr per location): unlimited products, 10 team, vendor orders, calendar, bulk import, AI (label photo, price checks), sales reports, Square. Premium ($99/mo or $990/yr): + Budget & expenses, receipt AI, QuickBooks, CRM (coming soon), unlimited team. `effectivePlan` is Free while paused. Client: `useBusiness().can(feature)` and `<PlanGate feature>`; server: `assertFeature` / `hasFeature` / `assertProductRoom` / `assertTeamRoom` in `account.server.ts` (also checked by scheduled functions and the integration connect route). Payments use Stripe over REST when `STRIPE_SECRET_KEY` and `STRIPE_PRICE_{PLUS,PREMIUM}_{MONTHLY,YEARLY}` are set (webhook at `/api/billing/webhook`, secret `STRIPE_WEBHOOK_SECRET`); without them the app is in pilot mode and plan changes apply with no charge. Pause = 1–3 months (Stripe `pause_collection`); cancel = at period end (trials end immediately).

**Pilot Premium.** `pilotPremium()` in `account.server.ts` marks a pilot site: builds of the `PILOT` branch (Netlify's build-time `BRANCH`, baked in as `__BINTRO_BUILD_BRANCH__` in `vite.config.ts`; scheduled functions fall back to the runtime `BRANCH` env) or wherever `BINTRO_PILOT_PREMIUM=true` (`false` forces it off). Pilot testers get Premium free for `PILOT_MONTHS` (18) from their first Scan In: `settle` stores the first `in` movement's time in `account.pilotStartedAt` (so undo/delete can't reset it); before that the clock hasn't started and Premium stays on. While `pilotActive`, `effectivePlanOf` returns premium, plan change / pause / resume / cancel return a "nothing to change" message, and `AccountView` shows "Pilot · included" (with days left in the last 30) and hides the plan picker and billing tab. When the 18 months run out the account moves to Free once (`pilotEndedAt`) and normal plans apply — unless the tester locked in the founding rate.

**Founding rate.** Pilot sites price everything at `FOUNDING_CENTS` in `plans.ts` (Plus $29/mo or $290/yr, Premium $69/mo or $690/yr) for life; `priceFor(plan, interval, account.founding)` everywhere (`founding` = `pilotPremium()`). On a pilot site the `STRIPE_PRICE_*` variables point at the founding prices, and Setup check compares against them. During the pilot, `FoundingOffer` (AccountView, loudest in the last 30 days) runs `lockInFounding` → `lockInFoundingRate`: Stripe Checkout with `subscription_data[trial_end]` = the pilot's end (if more than 48 h away), so the card is saved and nothing is charged until then; a second lock-in swaps the price (no proration). `settle` leaves a locked-in row alone during the pilot and, at the end, sets `pilotEndedAt` and keeps the subscription instead of moving to Free. `summarize` returns `lockedIn` (plan, interval, startsAt). "Undo lock-in" goes through `cancelPlan`, which deletes the waiting subscription during the pilot. The pilot site needs its own Stripe webhook destination (`<pilot>/api/billing/webhook`).

### Setup check
Settings → Setup check (`?settings=setup`) runs `runSetupCheck`: `pingAI` (a 5-token Claude call through `postToClaude`, with hints for a rejected key or no credit), `stripeCheck` (key mode test/live from its prefix, `/v1/account`, each `STRIPE_PRICE_*` fetched and compared with the plan's price and interval in `plans.ts` — GET only), `emailSetup` (Resend / SendGrid / none, custom sender) with a "Send me a test email" button to the profile email, Square/QuickBooks app keys present, and whether the site is a pilot. It never returns a key's value.

### Sign-in (Google)
`src/server/auth.server.ts`: Sign in with Google (authorization code + PKCE, `state` cookie for CSRF, `nonce` checked in the ID token; `/api/auth/google/{start,callback}`). Only emails in `app_users` get in; the first sign-in by env `BINTRO_OWNER_EMAIL` creates the owner. No passwords are stored; MFA is Google's 2-Step Verification. Sessions: random token in the httpOnly, Secure, SameSite=Lax `bintro_session` cookie (30 days); `app_sessions` stores only its SHA-256. **Every server function** carries `.middleware([requireUser])` (`auth.middleware.ts`) — add it to every new `createServerFn`; owner-only ones use `requireOwner`. Public: `getAuthState`, `signOut`. Integration connect/callback require an owner and billing return a signed-in user (`routeUser`); the calendar feed (secret token), Stripe webhook (signature) and legal pages stay public. The index loader returns `{ auth, data: null }` when signed out and `Gate` shows `SignInScreen`; the app reloads to sign-in on focus or a `SIGNED_OUT` error. Settings → Sign-in & access (`AccessPanel`): sign out, and owners add/remove Google emails (owner/staff; removing ends their sessions; the last owner can't be removed). **Until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set, sign-in is off and the app is open as before** (AccessPanel warns). Google redirect URI: `<site>/api/auth/google/callback`. The Scan tab's staff picker still records who scanned; sign-in controls who can open the app.

### Help & support
Settings shows a **Help & support** card on every panel (`HelpSupport` in `SettingsView.tsx`): "Email support" opens a mail draft to `LEGAL.supportEmail` with the business name, site, device and time filled in, and points to the integration error-log download. Until `supportEmail` is set (still `[support email]`) the card says so instead of showing the button.

### Legal pages
`/terms`, `/privacy` and `/eula` are public pages (needed for Intuit's QuickBooks production review and app marketplaces), linked at the bottom of Settings. All text lives in `src/lib/legal.ts`; company name, email, address, venue and effective date are in `LEGAL`, and any value still in [brackets] shows a "Draft" banner. The Privacy Policy lists the real processors (Netlify, Anthropic, Stripe, Resend/SendGrid, barcode lookups, Square/QuickBooks when connected) — update it when a new service gets data. The 30-day post-closure deletion and export-on-request promises are policy, carried out by hand today.

### Integrations
Env vars: `SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`, `SQUARE_ENVIRONMENT` (`sandbox` optional); `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_ENVIRONMENT` (`sandbox` optional); `env()` in `integrations.server.ts` also accepts the aliases `QB_ClIENT_ID` / `QB_CLIENT_ID` / `QB_CLIENT_SECRET` / `QB_ENVIRONMENT`. Redirect URLs are `<site>/api/integrations/{square|quickbooks}/callback`. Square: catalog import (matches by variation id, then UPC/SKU) and sales sync (completed orders → "out" movements by "Square POS", every 15 min). Bintro is the source of truth for stock and Square follows it: `applyMovement` queues a `square_outbox` row for every movement on a product with a `squareVariationId` (except movements by `SQUARE_STAFF_NAME`, which came from Square) and `flushSquareOutbox` sends it right away via BatchChangeInventory — `adjust` (counts) as a PHYSICAL_COUNT of the new on-hand, everything else as an ADJUSTMENT (NONE→IN_STOCK when adding, IN_STOCK→WASTE when removing) so concurrent Square sales aren't overwritten. Hand counts and stock-count imports pull Square sales first. Bulk imports pass `square: "later"` and flush once. Undo drops a pending row or sends the reverse. Batches Square rejects (400/404) are retried row by row and bad rows marked `error`; auth/outage failures stay `pending` for the scheduled retry. Only Square items in the owner's retail categories come into Bintro (`meta.retailCategoryIds`, picked in Settings → Connections via `SquareRetailPicker`; until chosen, categories named retail/resale/merch count); other Square items (services etc.) are skipped, and Bintro never creates or edits Square catalog items. Imported Square categories are filed under the `resale` tax group unless already filed. Catalog import aligns counts (Bintro's count is sent for items Bintro already had; new items start from Square's count) and Settings → Connections has "Send counts to Square" (`sendAllCountsToSquare`). Needs the INVENTORY_READ/INVENTORY_WRITE scopes; connections made before they were added show a reconnect prompt (`inventory.needsReconnect`). QuickBooks: pushes a month's expenses as Purchases, and stock spend per vendor once the month has ended. Token handling: access tokens refresh 5 minutes before expiry (`activeIntegration` → `refreshTokens`, rotated refresh tokens saved); a QuickBooks 401 refreshes and retries once (`qbFetch`). `invalid_grant` / `invalid_client` on refresh (refresh token expired or revoked) first re-reads the row in case another request already rotated it, otherwise `markNeedsReconnect` clears the tokens and sets `meta.reconnect`; status returns `expired` and Settings shows "Reconnect needed" with a Reconnect button. Every failed Square/QuickBooks call (API, token, connect callback, forced reconnect) is saved to `integration_logs` (action, status, code, `intuit_tid`, message; kept 365 days) by `logIntegrationError`, and each integration card has "Download error log" (CSV via `getIntegrationErrorLog`). Every QuickBooks response's `intuit_tid` header is logged with failures (method, path, status, Fault code) and added to the user-facing error as "QuickBooks ref …" for Intuit support. QuickBooks uses only Purchase and Account (every QBO edition, so plan upgrades/downgrades don't matter); if a cached account is rejected (deleted/inactive) `pushMonthToQuickBooks` picks accounts again and retries the line once, and each vendor push is saved as it goes. Reconnecting the same QuickBooks company keeps `meta` (pushed history) so nothing is sent twice. CSRF: `buildAuthorizeUrl` stores a random `pendingState`; a callback whose `state` doesn't match throws `StateMismatchError` and redirects with `error=<provider>-expired`.

### Connections directory
Below the live Square / QuickBooks cards, Settings → Connections shows **More connections** (`ConnectionDirectory`): a curated list from `src/lib/connection-directory.ts` (`CONNECTION_DIRECTORY`), filtered to the business type (`directoryFor`, with "Show apps for other kinds of businesses"), grouped Booking & POS / Bar POS / Accounting. Status `soon` = the platform has an open API Bintro can build on ("Coming soon"); `upload` = no API, works today through the Scan tab's sales report upload. Every card has **Request this connection** (stored in `connection_requests` via `requestConnection`; the list is demand data for partnership pitches) and a Visit link; one "Don't see yours?" box records anything else as `other`. Keep the list curated: add a platform only when shops of that type commonly use it.

### Staff attribution
Before each scan (orb tap, typed barcode, wand or Bluetooth scan) the Scan tab opens `StaffPicker`, a centered pop-up with a tile per saved team member (`askStaff()` in `index.tsx` returns a promise with the picked name). Settings → Scanner & Bluetooth can switch a device to ask only after 10 minutes without a scan (`shagnoir-ask-staff`). The header pill opens the same picker. The name is persisted to `localStorage` and passed down to
each view, which forwards it to the server functions as `staffName`; new names join the team.

### Bluetooth scanners
Keyboard (HID) scanners pair in the OS Bluetooth settings (Settings shows the steps per device) and are caught by the Scan tab's keydown capture. Scanners with a BLE serial service can connect from Settings via Web Bluetooth (Chrome/Edge; not Safari/iOS) — `src/lib/bluetooth-scanner.ts` keeps the connection alive across tabs, auto-reconnects, and `ScanView` subscribes with `onBluetoothCode`.

### Styling
Bintro's default theme is burgundy, olive and cream (`burgundy-olive`; the original royal blue & gold is the `royal` palette). Tokens keep their original names (`--color-page`, `surface`, `ink`, `line`, `action` = burgundy, `royal`/`royal-2` = deep burgundies, `gold`/`gold-bright`/`gold-ink`/`gold-tint` = olive accents, `good`/`warn`/`bad` + `-tint`) and live under `@theme` in `src/styles.css`, along with shared classes: `.brand-tile`, `.royal-rule`, `.tip-bulb`, `.tip-card`, `.btn` (`-primary`/`-gold`/`-tonal`/`-text`/`-danger`/`-sm`), `.chip` (uses `aria-pressed`), `.field-input`, `.orb`, `.skel`. The business's palette (Settings → Look & feel, `profile.palette`) overrides these tokens at runtime via `paletteStyle()` on `<html>` and the app wrapper, so never hardcode theme hex/rgba values — use the tokens or `color-mix()` on them. Use bottom sheets (`Sheet`) for dialogs (they lock page scroll through `lockScroll()` in `src/lib/scroll-lock.ts`, a shared counter, so stacked pop-ups can close in any order; any new overlay must use it rather than saving/restoring `body.style.overflow`) and `useToast` for confirmations. Gold is for accents and tips (use `gold-ink` for gold text on white); the action color is for actions. New tips go in `src/lib/tips.ts`. localStorage keys keep their `shagnoir-` prefix so existing devices keep their data.

## Development Commands

Local run against a throwaway Postgres (no Netlify plugin): apply `netlify/database/migrations/*/migration.sql`, copy `vite.config.ts` without `netlify()` to a temp config, and start with `NETLIFY_DB_URL=postgres://… NETLIFY_DB_DRIVER=server npx vite dev --config <temp>` (driver `server` = node-postgres; anything else uses Neon HTTP). Sign-in is off locally because the Google keys aren't set.


```bash
npm run dev      # Start dev server
npm run build    # Production build
```

## Conventions

- Components: PascalCase, one feature area per subdirectory under `src/components/`.
- Server-only helpers end in `.server.ts`; client-safe RPC wrappers end in `.functions.ts`.
- Schema changes always go through `db/schema.ts` + `npx drizzle-kit generate --name ...` — never hand-write `CREATE TABLE` SQL.
- Money is stored as integer cents (`unitCostCents`) and formatted for display with `centsToDollars`.
