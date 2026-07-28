# Play11 — Fantasy Cricket Platform

Play11 lets users create fantasy teams, join contests, and win prizes based on real cricket performances. It uses **Next.js 16** (App Router), **React 19**, **PostgreSQL**, and **Prisma**, with live data from the SportMonk Cricket API.

## Features

- User authentication and profile management (NextAuth.js)
- Upcoming, live, and completed match views
- Fantasy team creation with real match squads
- Contests with entry fees, prize pools, and leaderboards
- Wallet deposits, withdrawals, and transaction history (Razorpay optional)
- Live scoring and contest point updates
- Admin panel for users, matches, contests, and settings

## Tech Stack

| Area | Stack |
|------|--------|
| Framework | Next.js **16.2** (App Router + Proxy) |
| UI | React **19**, TypeScript, Tailwind CSS |
| API | Next.js Route Handlers (`src/app/api`) |
| Database | PostgreSQL + Prisma ORM **6.x** |
| Auth | NextAuth.js **4.24** + `@auth/prisma-adapter` |
| State | Zustand |
| Cricket data | SportMonk Cricket API |
| Forms | React Hook Form + Zod |
| Payments | Razorpay (optional) |

**Runtime:** Node.js **20.9+** (required by Next.js 16)

## Getting Started

### Prerequisites

- Node.js 20.9 or later and npm
- PostgreSQL

### Installation

1. Clone and install:

```bash
git clone https://github.com/sunnygoyal1983/play11-w.git
cd play11-w
npm install
```

`postinstall` runs `prisma generate` automatically.

2. Configure environment:

```bash
cp .env.example .env
```

Edit `.env` with your values. Minimum required:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/play11?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-here-min-32-chars"
SPORTMONK_API_KEY="your-sportmonk-api-key-here"
CRON_SECRET="generate-a-long-random-secret"
CRON_API_KEY="generate-a-long-random-api-key"
```

Optional: Razorpay, SMTP, and AWS S3 keys (see `.env.example`).

3. Set up the database:

```bash
npx prisma migrate dev
# or
npm run setup-db
```

4. Create an admin user with `role = ADMIN` in the database (do not rely on email allowlists). Scripts under `scripts/` can help bootstrap users if needed—**change default passwords immediately**.

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Webpack; see note below) |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | ESLint |
| `npm run generate-prisma` | Regenerate Prisma Client |
| `npm run setup-db` | Database setup helper |
| `npm run import-data` | Import SportMonk data |

> **Windows note:** Native Next.js SWC binaries may be blocked by Application Control on some machines. This project’s `dev` / `build` scripts use `--webpack` so builds still work. On Linux/macOS (or after allowing the SWC binary), you can drop `--webpack` to use Turbopack.

## Project Structure

```
play11-w/
├── prisma/                 # Schema and migrations
├── public/                 # Static assets
├── scripts/                # DB / import helpers
├── src/
│   ├── app/                # App Router pages + API routes
│   │   ├── admin/          # Admin UI
│   │   ├── api/            # REST / cron / payments APIs
│   │   ├── auth/           # Sign-in / sign-up
│   │   └── ...
│   ├── components/         # Shared UI
│   ├── lib/                # Auth helpers, Prisma, utilities
│   ├── proxy.ts            # Request proxy (auth / cron guards)
│   └── services/           # SportMonk and scoring services
├── .env.example
├── next.config.js
└── package.json
```

## Security

- **Admin APIs and pages** require an authenticated session with `role === 'ADMIN'`.
- **Cron / scheduler** endpoints require `x-cron-secret` or `x-api-key` matching `CRON_SECRET` / `CRON_API_KEY` (fail-closed if unset).
- **Import / schema / debug** maintenance routes are locked down or disabled for production safety.
- Never commit `.env`. Only `.env.example` is tracked.
- Keep `NEXTAUTH_SECRET` at least 32 characters and rotate secrets if they were ever exposed.

## Admin

Admin UI: `/admin`

- Users, contests, matches, teams, players
- Transactions and wallet tools
- Platform settings
- SportMonk import helpers

Admin access is **role-based** (`User.role = ADMIN`), not email-based.

## API Overview

Public/read APIs serve matches, contests, players, and tournaments. Sensitive routes are protected:

| Area | Auth |
|------|------|
| `/api/admin/*` | Admin session |
| `/api/cron/*`, `/api/cron` | `CRON_SECRET` / `CRON_API_KEY` |
| `/api/import`, `/api/scheduler`, `/api/sportmonk` | Admin session |
| `/api/user/*`, contest join, wallet | Logged-in user |
| `/api/payments/razorpay/*` | Signature + configured Razorpay secret |

### Import sequence (admin session required)

Import in dependency order to avoid FK errors:

1. Tournaments → 2. Teams → 3. Matches → 4. Players  

Or import all for a tournament:

```bash
curl -X POST http://localhost:3000/api/import \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin-session-cookie>" \
  -d '{"entityType": "all", "tournamentId": "123"}'
```

Use an authenticated admin browser session or equivalent cookie/header when calling import APIs.

### Common endpoints

- `GET /api/matches?type=upcoming|live|recent`
- `GET /api/matches/[id]`
- `GET /api/contests`, `POST /api/contests/[id]/join`
- `GET /api/tournaments`, `GET /api/players`, `GET /api/teams`

## Database

Schema lives in `prisma/schema.prisma`. Main models:

- Users & auth sessions
- Tournaments, teams, matches, players
- Contests, entries, prize breakups
- Fantasy teams
- Transactions / wallet
- Settings

```bash
npx prisma migrate dev
npx prisma studio   # optional GUI
```

## Payments (optional)

Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to enable deposits. Verification rejects requests if the secret is missing and uses atomic updates to avoid double-credit.

## Deployment

1. Set production env vars (`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, SportMonk, cron secrets, Razorpay if used).
2. Build and start:

```bash
npm run build
npm start
```

`output: 'standalone'` is enabled in `next.config.js` for container-friendly deploys. [Vercel](https://vercel.com) also works well with Next.js.

Ensure cron jobs send `x-cron-secret` (or `x-api-key`) in production.

## License

MIT — see `LICENSE` if present.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [SportMonk](https://www.sportmonks.com/)
- [NextAuth.js](https://next-auth.js.org/)
