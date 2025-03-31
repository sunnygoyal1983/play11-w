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
