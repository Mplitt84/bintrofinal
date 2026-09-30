# Shag Noir Inventory

A barcode scan-in/scan-out inventory tracker built for Shag Noir's retail and backbar stock. Scan a product to log it in (received) or out (used/sold), and watch on-hand counts update live. A separate inventory view shows stock levels, flags low and out-of-stock items, and lets staff edit product details or add new products, including linking an unrecognized barcode to a product on the spot.

## Key features

- **Scan Station** — toggle between scan-in and scan-out, scan or type a barcode, adjust quantity, and get instant visual feedback on the resulting stock count.
- **Unknown barcode handling** — if a scanned barcode isn't in the system, search for an existing product to link it to, or create a new product on the fly.
- **Recent activity** — a live feed of the latest scans with one-click undo.
- **Inventory dashboard** — SKU count, units on hand, low-stock and out-of-stock counts, with search/filter and inline product editing.
- **Below Par** — every product at or under its restock level, with the units needed to get back to par and a one-click button that emails the list to the salon.
- **Staff attribution** — staff type their name once per device; scans, stock edits and restock emails are all logged against it.

## Tech stack

- [TanStack Start](https://tanstack.com/start) + React 19 + TanStack Router
- Tailwind CSS 4 for styling
- [Netlify Database](https://docs.netlify.com/database) (managed Postgres) with Drizzle ORM for persistence

## Running locally

```bash
npm install
npm run dev
```

The dev server runs through the Netlify CLI so the database connection is emulated automatically — no manual connection string setup is needed.

## Data model

- `products` — barcode, name, category, brand, size, on-hand quantity, reorder threshold, unit cost.
- `movements` — an append-only log of every scan in/out, including who made it (used for the activity feed and undo).

Products default to a reorder threshold of 2 — an item is flagged as below par once its on-hand count reaches that number.

## Restock email

The **Below Par** tab emails the restock list to `info@shagnoirsalon.com` from the server. Set one of these
environment variables in Netlify to enable sending:

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Send via [Resend](https://resend.com) (preferred if both are set) |
| `SENDGRID_API_KEY` | Send via SendGrid |
| `RESTOCK_EMAIL_FROM` | Optional sender override; defaults to `inventory@shagnoirsalon.com` (must be a domain verified with your provider) |
| `RESTOCK_EMAIL_TO` | Optional recipient override; defaults to `info@shagnoirsalon.com` |
| `SALON_TIMEZONE` | Optional timezone for the timestamp in the email; defaults to `America/New_York` |

Until a provider key is set, the button explains what is missing instead of silently failing.

## Schema changes

Schema changes live in `db/schema.ts`; run `npx drizzle-kit generate --name <description>` after editing it to produce a migration.
