"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const sportmonkApi = __importStar(require("../src/services/sportmonk-api"));
const uuid_1 = require("uuid");
// Initialize Prisma client
const prisma = new client_1.PrismaClient();
// Main function to import data
function importSportMonkData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Starting SportMonk data import...');
            // Import upcoming matches
            yield importUpcomingMatches();
            // Import teams and players for those matches
            yield importTeamsAndPlayers();
            // Create sample contests for matches
            yield createSampleContests();
            console.log('SportMonk data import completed successfully!');
        }
        catch (error) {
            console.error('Error during SportMonk data import:', error);
            throw error;
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
// Import upcoming matches
function importUpcomingMatches() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Importing upcoming matches...');
            // Fetch upcoming matches from SportMonk API
            const upcomingMatchesData = yield sportmonkApi.fetchUpcomingMatches(1, 20);
            const upcomingMatches = upcomingMatchesData.data;
            console.log(`Found ${upcomingMatches.length} upcoming matches`);
            // Process each match
            for (const match of upcomingMatches) {
                const localTeam = match.localteam;
                const visitorTeam = match.visitorteam;
                const league = match.league;
                // Format match data for database
                const matchData = {
                    id: (0, uuid_1.v4)(),
                    sportMonkId: match.id.toString(),
                    name: `${localTeam.name} vs ${visitorTeam.name}`,
                    format: match.type || 'T20',
                    status: 'upcoming',
                    startTime: new Date(match.starting_at),
                    endTime: match.ending_at ? new Date(match.ending_at) : undefined,
                    venue: ((_a = match.venue) === null || _a === void 0 ? void 0 : _a.name) || 'TBD',
                    teamAId: localTeam.id.toString(),
                    teamAName: localTeam.name,
                    teamALogo: localTeam.image_path,
                    teamBId: visitorTeam.id.toString(),
                    teamBName: visitorTeam.name,
                    teamBLogo: visitorTeam.image_path,
                    leagueId: (_b = league === null || league === void 0 ? void 0 : league.id) === null || _b === void 0 ? void 0 : _b.toString(),
                    leagueName: league === null || league === void 0 ? void 0 : league.name,
                    isActive: true
                };
                // Check if match already exists
                const existingMatch = yield prisma.match.findUnique({
                    where: {
                        sportMonkId: match.id.toString()
                    },
                    select: {
                        id: true
                    }
                });
                if (existingMatch) {
                    // Update existing match
                    yield prisma.match.update({
                        where: {
                            sportMonkId: match.id.toString()
                        },
                        data: matchData
                    });
                    console.log(`Updated match: ${matchData.name}`);
                }
                else {
                    // Create new match
                    yield prisma.match.create({
                        data: matchData
                    });
                    console.log(`Created match: ${matchData.name}`);
                }
            }
            console.log('Matches import completed');
        }
        catch (error) {
            console.error('Error importing matches:', error);
            throw error;
        }
    });
}
// Import teams and players
function importTeamsAndPlayers() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Importing teams and players...');
            // Get all matches from database
            const matches = yield prisma.match.findMany({
                where: {
                    status: 'upcoming',
                    isActive: true
                },
                select: {
                    id: true,
                    teamAId: true,
                    teamBId: true
                }
            });
            console.log(`Found ${matches.length} matches to import teams and players for`);
            // Keep track of teams we've already processed
            const processedTeamIds = new Set();
            // Process each match
            for (const match of matches) {
                const teamIds = [match.teamAId, match.teamBId];
                // Process each team in the match
                for (const teamId of teamIds) {
                    // Skip if we've already processed this team
                    if (processedTeamIds.has(teamId)) {
                        continue;
                    }
                    // Mark team as processed
                    processedTeamIds.add(teamId);
                    // Fetch players for this team
                    const teamData = yield sportmonkApi.fetchTeamPlayers(parseInt(teamId));
                    const team = teamData.data;
                    if (!team || !team.squad) {
                        console.log(`No squad data found for team ${teamId}, skipping...`);
                        continue;
                    }
                    console.log(`Processing team: ${team.name} with ${team.squad.length} players`);
                    // Process each player in the team
                    for (const squadMember of team.squad) {
                        const player = squadMember.player;
                        if (!player || !player.id) {
                            console.log('Invalid player data, skipping...');
                            continue;
                        }
                        // Fetch detailed player info
                        const playerDetailsData = yield sportmonkApi.fetchPlayerDetails(player.id);
                        const playerDetails = playerDetailsData.data;
                        if (!playerDetails) {
                            console.log(`No details found for player ${player.id}, skipping...`);
                            continue;
                        }
                        // Determine player role
                        let role = 'Unknown';
                        if (playerDetails.position) {
                            if (playerDetails.position.name === 'Batsman') {
                                role = 'Batsman';
                            }
                            else if (playerDetails.position.name === 'Bowler') {
                                role = 'Bowler';
                            }
                            else if (playerDetails.position.name === 'Allrounder') {
                                role = 'All-rounder';
                            }
                            else if (playerDetails.position.name === 'Wicketkeeper') {
                                role = 'Wicket-keeper';
                            }
                        }
                        // Calculate player credits based on career stats (simplified)
                        let credits = 8.0; // Default value
                        if (playerDetails.career) {
                            const battingAvg = playerDetails.career.batting.average || 0;
                            const bowlingAvg = playerDetails.career.bowling.average || 100;
                            if (role === 'Batsman') {
                                credits = Math.min(10, 7 + (battingAvg / 50));
                            }
                            else if (role === 'Bowler') {
                                credits = Math.min(10, 7 + (30 / Math.max(1, bowlingAvg)));
                            }
                            else if (role === 'All-rounder') {
                                credits = Math.min(10, 7 + (battingAvg / 80) + (20 / Math.max(1, bowlingAvg)));
                            }
                            else if (role === 'Wicket-keeper') {
                                credits = Math.min(10, 7 + (battingAvg / 40));
                            }
                        }
                        // Round credits to 1 decimal place
                        credits = Math.round(credits * 10) / 10;
                        // Format player data for database
                        const playerData = {
                            id: (0, uuid_1.v4)(),
                            sportMonkId: player.id.toString(),
                            name: player.fullname || `${player.firstname} ${player.lastname}`,
                            role: role,
                            country: playerDetails.country ? playerDetails.country.name : 'Unknown',
                            battingStyle: playerDetails.battingstyle || 'Unknown',
                            bowlingStyle: playerDetails.bowlingstyle || 'Unknown',
                            teamId: teamId,
                            teamName: team.name,
                            credits: credits,
                            imageUrl: playerDetails.image_path,
                            isActive: true
                        };
                        // Check if player already exists
                        const existingPlayer = yield prisma.player.findFirst({
                            where: {
                                sportMonkId: player.id.toString()
                            },
                            select: {
                                id: true
                            }
                        });
                        if (existingPlayer) {
                            // Update existing player
                            yield prisma.player.update({
                                where: {
                                    id: existingPlayer.id
                                },
                                data: playerData
                            });
                            console.log(`Updated player: ${playerData.name}`);
                        }
                        else {
                            // Create new player
                            yield prisma.player.create({
                                data: playerData
                            });
                            console.log(`Created player: ${playerData.name}`);
                        }
                    }
                }
            }
            console.log('Teams and players import completed');
        }
        catch (error) {
            console.error('Error importing teams and players:', error);
            throw error;
        }
    });
}
// Create sample contests for each match
function createSampleContests() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Creating sample contests for matches...');
            // Get all upcoming matches
            const matches = yield prisma.match.findMany({
                where: {
                    status: 'upcoming',
                    isActive: true
                }
            });
            console.log(`Creating contests for ${matches.length} matches`);
            // Contest templates
            const contestTemplates = [
                {
                    name: 'Grand Prize Pool',
                    entryFee: 499,
                    prizePool: 1000000,
                    totalPrize: 1000000,
                    totalSpots: 10000,
                    firstPrize: 100000,
                    winnerPercentage: 40,
                    winnerCount: 4000
                },
                {
                    name: 'Winner Takes All',
                    entryFee: 999,
                    prizePool: 500000,
                    totalPrize: 500000,
                    totalSpots: 500,
                    firstPrize: 250000,
                    winnerPercentage: 10,
                    winnerCount: 50
                },
                {
                    name: 'Practice Contest',
                    entryFee: 0,
                    prizePool: 10000,
                    totalPrize: 10000,
                    totalSpots: 10000,
                    firstPrize: 1000,
                    winnerPercentage: 50,
                    winnerCount: 5000
                },
                {
                    name: 'Mega Contest',
                    entryFee: 299,
                    prizePool: 300000,
                    totalPrize: 300000,
                    totalSpots: 5000,
                    firstPrize: 50000,
                    winnerPercentage: 30,
                    winnerCount: 1500
                }
            ];
            // Process each match
            for (const match of matches) {
                // Check if match already has contests
                const existingContests = yield prisma.contest.count({
                    where: {
                        matchId: match.id
                    }
                });
                if (existingContests > 0) {
                    console.log(`Match ${match.id} already has contests, skipping...`);
                    continue;
                }
                // Create contests for this match
                for (const template of contestTemplates) {
                    yield prisma.contest.create({
                        data: {
                            id: (0, uuid_1.v4)(),
                            matchId: match.id,
                            name: template.name,
                            entryFee: template.entryFee,
                            prizePool: template.prizePool,
                            totalPrize: template.totalPrize,
                            totalSpots: template.totalSpots,
                            filledSpots: 0,
                            firstPrize: template.firstPrize,
                            winnerPercentage: template.winnerPercentage,
                            winnerCount: template.winnerCount,
                            isActive: true
                        }
                    });
                }
                console.log(`Created contests for match: ${match.id}`);
            }
            console.log('Sample contests creation completed');
        }
        catch (error) {
            console.error('Error creating sample contests:', error);
            throw error;
        }
    });
}
// Run the import function
importSportMonkData()
    .then(() => {
    console.log('Import completed successfully');
    process.exit(0);
})
    .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
});
