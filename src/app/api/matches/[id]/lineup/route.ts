import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getMatchLineup,
  refreshLineupFromApi,
} from '@/services/lineup-service';

interface PlayerLineup {
  id: string;
  name: string;
  role: string;
  image?: string;
  isSubstitute?: boolean;
}

// Mock lineup data for testing
const MOCK_LINEUP_TEAM_A = [
  {
    id: '1',
    name: 'Rohit Sharma (c)',
    role: 'BAT',
    image: 'https://cdn.sportmonks.com/images/cricket/players/4/4.png',
  },
  {
    id: '2',
    name: 'Virat Kohli',
    role: 'BAT',
    image: 'https://cdn.sportmonks.com/images/cricket/players/3/3.png',
  },
  {
    id: '3',
    name: 'Shubman Gill',
    role: 'BAT',
    image: 'https://cdn.sportmonks.com/images/cricket/players/231/231.png',
  },
  {
    id: '4',
    name: 'Shreyas Iyer',
    role: 'BAT',
    image: 'https://cdn.sportmonks.com/images/cricket/players/45/45.png',
  },
  {
    id: '5',
    name: 'KL Rahul (wk)',
    role: 'WK',
    image: 'https://cdn.sportmonks.com/images/cricket/players/17/17.png',
  },
  {
    id: '6',
    name: 'Hardik Pandya',
    role: 'AR',
    image: 'https://cdn.sportmonks.com/images/cricket/players/11/11.png',
  },
  {
    id: '7',
    name: 'Ravindra Jadeja',
    role: 'AR',
    image: 'https://cdn.sportmonks.com/images/cricket/players/9/9.png',
  },
  {
    id: '8',
    name: 'R Ashwin',
    role: 'BOWL',
    image: 'https://cdn.sportmonks.com/images/cricket/players/7/7.png',
  },
  {
    id: '9',
    name: 'Kuldeep Yadav',
    role: 'BOWL',
    image: 'https://cdn.sportmonks.com/images/cricket/players/28/28.png',
  },
  {
    id: '10',
    name: 'Mohammed Siraj',
    role: 'BOWL',
    image: 'https://cdn.sportmonks.com/images/cricket/players/90/90.png',
  },
  {
    id: '11',
    name: 'Jasprit Bumrah',
    role: 'BOWL',
    image: 'https://cdn.sportmonks.com/images/cricket/players/78/78.png',
  },
];

const MOCK_LINEUP_TEAM_B = [
  {
    id: '101',
    name: 'Babar Azam (c)',
    role: 'BAT',
    image: 'https://cdn.sportmonks.com/images/cricket/players/55/55.png',
  },
  {
    id: '102',
    name: 'Mohammad Rizwan (wk)',
    role: 'WK',
    image: 'https://cdn.sportmonks.com/images/cricket/players/79/79.png',
  },
  {
    id: '103',
    name: 'Fakhar Zaman',
    role: 'BAT',
    image: 'https://cdn.sportmonks.com/images/cricket/players/80/80.png',
  },
  {
    id: '104',
    name: 'Imam-ul-Haq',
    role: 'BAT',
    image: 'https://cdn.sportmonks.com/images/cricket/players/64/64.png',
  },
  {
    id: '105',
    name: 'Shadab Khan',
    role: 'AR',
    image: 'https://cdn.sportmonks.com/images/cricket/players/88/88.png',
  },
  {
    id: '106',
    name: 'Imad Wasim',
    role: 'AR',
    image: 'https://cdn.sportmonks.com/images/cricket/players/85/85.png',
  },
  {
    id: '107',
    name: 'Mohammad Nawaz',
    role: 'AR',
    image: 'https://cdn.sportmonks.com/images/cricket/players/91/91.png',
  },
  {
    id: '108',
    name: 'Haris Rauf',
    role: 'BOWL',
    image: 'https://cdn.sportmonks.com/images/cricket/players/123/123.png',
  },
  {
    id: '109',
    name: 'Shaheen Afridi',
    role: 'BOWL',
    image: 'https://cdn.sportmonks.com/images/cricket/players/99/99.png',
  },
  {
    id: '110',
    name: 'Naseem Shah',
    role: 'BOWL',
    image: 'https://cdn.sportmonks.com/images/cricket/players/161/161.png',
  },
  {
    id: '111',
    name: 'Mohammad Hasnain',
    role: 'BOWL',
    image: 'https://cdn.sportmonks.com/images/cricket/players/162/162.png',
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Check if match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    try {
      // Either get lineup from database or fetch from API
      const lineupData = forceRefresh
        ? await refreshLineupFromApi(matchId)
        : await getMatchLineup(matchId);

      return NextResponse.json(lineupData);
    } catch (error) {
      console.error('Error fetching lineup data:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch lineup data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in lineup endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
