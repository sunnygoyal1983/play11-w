# Play11 - Fantasy Cricket Platform

Play11 is a fantasy cricket platform that allows users to create teams, join contests, and win cash prizes based on the real-life performance of cricket players. This project is built using Next.js for the frontend and PostgreSQL for the database, with Prisma as the ORM.

## Features

- **User Authentication**: Register, login, and profile management
- **Match Management**: View upcoming, live, and completed cricket matches
- **Team Creation**: Create fantasy teams with players from real cricket matches
- **Contest Participation**: Join contests with different entry fees and prize pools
- **Wallet System**: Add money, withdraw winnings, and track transactions
- **Live Scoring**: Real-time updates of player performances and points
- **Leaderboards**: Track your rank in contests and competitions

## Tech Stack

- **Frontend**: Next.js 13+ with App Router, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: Zustand
- **API Integration**: SportMonk Cricket API
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Custom components with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/play11.git
cd play11
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory with the following variables:

```
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=play11
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# NextAuth configuration
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# SportMonk API
SPORTMONK_API_KEY="your-sportmonk-api-key"
SPORTMONK_API_URL="https://cricket.sportmonk.com/api/v2.0"
```

4. Initialize the database:

```bash
npx prisma migrate dev --name init
```

5. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
play11/
├── prisma/                  # Prisma schema and migrations
├── public/                  # Static assets
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API routes
│   │   ├── routes/          # App routes
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions and libraries
│   └── services/            # External API services
├── .env                     # Environment variables
├── next.config.js           # Next.js configuration
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

## API Integration

This project uses the SportMonk Cricket API to fetch real cricket data. You'll need to sign up for an API key at [SportMonk](https://sportmonk.com/) to use the live data features.

## Database Schema

The database schema is defined in `prisma/schema.prisma` and includes models for:

- Users
- Matches
- Players
- Contests
- Fantasy Teams
- Transactions
- Player Statistics

## Deployment

The easiest way to deploy your Play11 application is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/) - The React Framework
- [Prisma](https://prisma.io/) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [SportMonk](https://sportmonk.com/) - Cricket API provider

# SportMonk Cricket API Integration

This repository contains a Next.js application with API routes for fetching cricket data from the SportMonk API and storing it in a PostgreSQL database using Prisma.

## API Structure

The API is organized into separate endpoints for different entity types with clear dependencies between them:

1. **Tournaments** - The foundation of the data hierarchy
2. **Teams** - Teams can be part of tournaments
3. **Matches** - Matches belong to tournaments and involve teams
4. **Players** - Players belong to teams

## API Endpoints

### Tournaments API

- `GET /api/tournaments` - Get all tournaments
- `GET /api/tournaments/:id` - Get details for a specific tournament
- `GET /api/tournaments/:id/matches` - Get matches for a specific tournament

### Teams API

- `GET /api/teams` - Get all teams
- `GET /api/teams?tournament_id=X` - Get teams for a specific tournament
- `GET /api/teams/:id` - Get details for a specific team
- `GET /api/teams/:id/players` - Get players for a specific team

### Matches API

- `GET /api/matches` - Get all matches
- `GET /api/matches?type=upcoming` - Get upcoming matches
- `GET /api/matches?type=live` - Get live matches
- `GET /api/matches?type=recent` - Get recent matches
- `GET /api/matches/:id` - Get details for a specific match

### Players API

- `GET /api/players` - Get all players
- `GET /api/players?team_id=X` - Get players for a specific team
- `GET /api/players/:id` - Get details for a specific player

### Import API

- `POST /api/import` - Import data in the correct sequence
  - Request body:
    ```json
    {
      "entityType": "all", // or "tournaments", "teams", "matches", "players"
      "tournamentId": "123" // Optional: Specific tournament ID
    }
    ```

## Correct Import Sequence

To avoid foreign key constraint errors, import data in this order:

1. **Import tournaments first**

   ```bash
   curl -X POST http://localhost:3000/api/import -H "Content-Type: application/json" -d '{"entityType": "tournaments"}'
   ```

2. **Import teams for a tournament**

   ```bash
   curl -X POST http://localhost:3000/api/import -H "Content-Type: application/json" -d '{"entityType": "teams", "tournamentId": "123"}'
   ```

3. **Import matches for a tournament**

   ```bash
   curl -X POST http://localhost:3000/api/import -H "Content-Type: application/json" -d '{"entityType": "matches", "tournamentId": "123"}'
   ```

4. **Import players for teams in a tournament**

   ```bash
   curl -X POST http://localhost:3000/api/import -H "Content-Type: application/json" -d '{"entityType": "players", "tournamentId": "123"}'
   ```

5. **Import everything for a tournament in sequence**
   ```bash
   curl -X POST http://localhost:3000/api/import -H "Content-Type: application/json" -d '{"entityType": "all", "tournamentId": "123"}'
   ```

## Database Schema

The application uses the following database structure:

- **Tournament** - Cricket leagues and tournaments
- **Team** - Cricket teams
- **Match** - Cricket matches between teams
- **Player** - Cricket players belonging to teams

## Setup and Configuration

1. Set up environment variables in `.env`:

   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/play11"
   SPORTMONK_API_KEY="your_api_key_here"
   ```

2. Run database migrations:

   ```
   npx prisma migrate dev
   ```

3. Start the development server:

   ```
   npm run dev
   ```

4. Import data:
   ```
   curl -X POST http://localhost:3000/api/import -H "Content-Type: application/json" -d '{"entityType": "all"}'
   ```
