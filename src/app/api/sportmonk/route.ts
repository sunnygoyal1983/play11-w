import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  fetchUpcomingMatches,
  fetchLiveMatches,
  fetchRecentMatches,
  fetchMatchDetails,
  fetchPlayerDetails,
  fetchTeamPlayers,
} from '@/services/sportmonk-api';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'upcoming';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '10');
    const id = searchParams.get('id');

    let data;

    switch (type) {
      case 'upcoming':
        data = await fetchUpcomingMatches(page, perPage);
        break;
      case 'live':
        data = await fetchLiveMatches(page, perPage);
        break;
      case 'recent':
        data = await fetchRecentMatches(page, perPage);
        break;
      case 'match':
        if (!id) throw new Error('Match ID is required');
        data = await fetchMatchDetails(parseInt(id));
        break;
      case 'player':
        if (!id) throw new Error('Player ID is required');
        data = await fetchPlayerDetails(parseInt(id));
        break;
      case 'team':
        if (!id) throw new Error('Team ID is required');
        data = await fetchTeamPlayers(parseInt(id));
        break;
      default:
        throw new Error('Invalid type parameter');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Import matches from Sportsmonk
async function importMatches() {
  const data = await fetchUpcomingMatches(1, 100);
  
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
        isActive: true,
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
        isActive: true,
      },
    });
  }
}

// Import teams from Sportsmonk
async function importTeams() {
  const data = await fetchTeamPlayers(1);

  for (const team of data.data) {
    await prisma.team.upsert({
      where: { id: team.id.toString() },
      update: {
        name: team.name,
        code: team.code,
        image: team.image_path,
        country: team.country,
        isActive: true,
      },
      create: {
        id: team.id.toString(),
        name: team.name,
        code: team.code,
        image: team.image_path,
        country: team.country,
        isActive: true,
      },
    });
  }
}

// Import players from Sportsmonk
async function importPlayers() {
  const data = await fetchPlayerDetails(1);

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
        isActive: true,
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
        isActive: true,
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
