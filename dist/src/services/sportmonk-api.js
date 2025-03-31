"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTeamPlayers = exports.fetchPlayerDetails = exports.fetchMatchDetails = exports.fetchRecentMatches = exports.fetchLiveMatches = exports.fetchUpcomingMatches = void 0;
const axios_1 = __importDefault(require("axios"));
const API_KEY = process.env.SPORTMONK_API_KEY;
const API_URL = process.env.SPORTMONK_API_URL || 'https://cricket.sportmonk.com/api/v2.0';
const sportmonkApi = axios_1.default.create({
    baseURL: API_URL,
    params: {
        api_token: API_KEY
    }
});
const fetchUpcomingMatches = (page = 1, perPage = 10) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield sportmonkApi.get('/fixtures', {
            params: {
                include: 'localteam,visitorteam,venue,league',
                filter: {
                    status: 'NS', // Not Started
                },
                sort: 'starting_at',
                page,
                per_page: perPage
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching upcoming matches:', error);
        throw error;
    }
});
exports.fetchUpcomingMatches = fetchUpcomingMatches;
const fetchLiveMatches = (page = 1, perPage = 10) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield sportmonkApi.get('/livescores', {
            params: {
                include: 'localteam,visitorteam,venue,league,scoreboards,batting,bowling',
                filter: {
                    status: 'LIVE',
                },
                page,
                per_page: perPage
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching live matches:', error);
        throw error;
    }
});
exports.fetchLiveMatches = fetchLiveMatches;
const fetchRecentMatches = (page = 1, perPage = 10) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield sportmonkApi.get('/fixtures', {
            params: {
                include: 'localteam,visitorteam,venue,league,runs',
                filter: {
                    status: 'Finished',
                },
                sort: '-starting_at',
                page,
                per_page: perPage
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching recent matches:', error);
        throw error;
    }
});
exports.fetchRecentMatches = fetchRecentMatches;
const fetchMatchDetails = (matchId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield sportmonkApi.get(`/fixtures/${matchId}`, {
            params: {
                include: 'localteam,visitorteam,venue,league,scoreboards,batting,bowling,lineup,runs,manofmatch'
            }
        });
        return response.data;
    }
    catch (error) {
        console.error(`Error fetching match details for match ${matchId}:`, error);
        throw error;
    }
});
exports.fetchMatchDetails = fetchMatchDetails;
const fetchPlayerDetails = (playerId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield sportmonkApi.get(`/players/${playerId}`, {
            params: {
                include: 'country,career,teams,currentteams'
            }
        });
        return response.data;
    }
    catch (error) {
        console.error(`Error fetching player details for player ${playerId}:`, error);
        throw error;
    }
});
exports.fetchPlayerDetails = fetchPlayerDetails;
const fetchTeamPlayers = (teamId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield sportmonkApi.get(`/teams/${teamId}`, {
            params: {
                include: 'squad'
            }
        });
        return response.data;
    }
    catch (error) {
        console.error(`Error fetching team players for team ${teamId}:`, error);
        throw error;
    }
});
exports.fetchTeamPlayers = fetchTeamPlayers;
exports.default = sportmonkApi;
