import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sportsmonk API configuration
const SPORTSMONK_API_KEY = process.env.SPORTSMONK_API_KEY || '';
const SPORTSMONK_BASE_URL =
  process.env.SPORTMONK_API_URL || 'https://cricket.sportmonk.com/api/v2.0';

// Helper function to fetch data from Sportsmonk API
export async function fetchSportsmonkData(endpoint: string) {
  try {
    const response = await fetch(
      `${SPORTSMONK_BASE_URL}${endpoint}?api_token=${SPORTSMONK_API_KEY}`
    );
    if (!response.ok)
      throw new Error(`Sportsmonk API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// Import matches from Sportsmonk
async function importMatches() {
  const data = await fetchSportsmonkData('/matches');

  // Transform and insert matches into database
  for (const match of data.data) {
    await prisma.match.upsert({
      where: { id: match.id },
      update: {
        sportMonkId: match.id.toString(),
        name: match.name,
        format: match.format || 'T20',
        status: match.status,
        startTime: new Date(match.starting_at),
        endTime: match.end_at ? new Date(match.end_at) : null,
        venue: match.venue?.name || 'TBD',
        teamAId: match.localteam_id.toString(),
        teamAName: match.localteam?.name || '',
        teamALogo: match.localteam?.image_path,
        teamBId: match.visitorteam_id.toString(),
        teamBName: match.visitorteam?.name || '',
        teamBLogo: match.visitorteam?.image_path,
        leagueId: match.league_id?.toString(),
        leagueName: match.league?.name,
        result: match.note || null,
        isActive: true
      },
      create: {
        id: match.id.toString(),
        sportMonkId: match.id.toString(),
        name: match.name,
        format: match.format || 'T20',
        status: match.status,
        startTime: new Date(match.starting_at),
        endTime: match.end_at ? new Date(match.end_at) : null,
        venue: match.venue?.name || 'TBD',
        teamAId: match.localteam_id.toString(),
        teamAName: match.localteam?.name || '',
        teamALogo: match.localteam?.image_path,
        teamBId: match.visitorteam_id.toString(),
        teamBName: match.visitorteam?.name || '',
        teamBLogo: match.visitorteam?.image_path,
        leagueId: match.league_id?.toString(),
        leagueName: match.league?.name,
        result: match.note || null,
        isActive: true
      },
    });
  }
}

// Import teams from Sportsmonk
async function importTeams() {
  const data = await fetchSportsmonkData('/teams');

  for (const team of data.data) {
    await prisma.team.upsert({
      where: { id: team.id.toString() },
      update: {
        name: team.name,
        code: team.code,
        image: team.image_path,
        country: team.country,
        isActive: true
      },
      create: {
        id: team.id.toString(),
        name: team.name,
        code: team.code,
        image: team.image_path,
        country: team.country,
        isActive: true
      },
    });
  }
}

// Import players from Sportsmonk
async function importPlayers() {
  const data = await fetchSportsmonkData('/players');

  for (const player of data.data) {
    await prisma.player.upsert({
      where: { id: player.id.toString() },
      update: {
        sportMonkId: player.id.toString(),
        name: player.fullname,
        image: player.image_path,
        imageUrl: player.image_path,
        country: player.country?.name || '',
        teamId: player.team_id?.toString() || '',
        teamName: player.team?.name || '',
        role: player.position?.name || 'Unknown',
        battingStyle: player.batting_style,
        bowlingStyle: player.bowling_style,
        credits: 8.0,
        isActive: true
      },
      create: {
        id: player.id.toString(),
        sportMonkId: player.id.toString(),
        name: player.fullname,
        image: player.image_path,
        imageUrl: player.image_path,
        country: player.country?.name || '',
        teamId: player.team_id?.toString() || '',
        teamName: player.team?.name || '',
        role: player.position?.name || 'Unknown',
        battingStyle: player.batting_style,
        bowlingStyle: player.bowling_style,
        credits: 8.0,
        isActive: true
      },
    });
  }
}

export async function POST() {
  try {
    await Promise.all([importMatches(), importTeams(), importPlayers()]);

    return NextResponse.json({
      success: true,
      message: 'Data imported successfully from Sportsmonk API',
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import data' },
      { status: 500 }
    );
  }
}
