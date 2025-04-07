'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FaArrowLeft,
  FaEdit,
  FaStar,
  FaCrown,
  FaSync,
  FaUsers,
} from 'react-icons/fa';

type Player = {
  id: string;
  playerId: string;
  teamId: string;
  points: number;
  selected: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isSubstitute: boolean;
  player: {
    id: string;
    name: string;
    image: string | null;
    role: string | null;
    teamName: string | null;
    battingStyle: string | null;
    bowlingStyle: string | null;
  };
};

type MatchData = {
  match: {
    id: string;
    name: string;
    teamA: {
      id: string;
      name: string;
    };
    teamB: {
      id: string;
      name: string;
    };
  };
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  otherPlayers: Player[];
  totalPlayers: number;
};

export default function MatchPlayersPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;

  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'teamA' | 'teamB' | 'other'>(
    'teamA'
  );
  const [importingPlayers, setImportingPlayers] = useState(false);
  const [importingSquadPlayers, setImportingSquadPlayers] = useState(false);

  useEffect(() => {
    const fetchMatchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/admin/match-players?matchId=${matchId}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch match players: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

        const data = await response.json();
        setMatchData(data);
      } catch (error) {
        console.error('Error fetching match players:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch match players'
        );
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchMatchPlayers();
    }
  }, [matchId]);

  const importPlayers = async () => {
    try {
      setImportingPlayers(true);
      const response = await fetch(
        `/api/import-matchplayers?matchId=${matchId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to import players: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Refresh the data
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to import players');
      }
    } catch (error) {
      console.error('Error importing players:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to import players'
      );
    } finally {
      setImportingPlayers(false);
    }
  };

  const importSquadPlayers = async () => {
    try {
      setImportingSquadPlayers(true);
      const response = await fetch(
        `/api/import-squad-players?matchId=${matchId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to import squad players: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Refresh the data
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to import squad players');
      }
    } catch (error) {
      console.error('Error importing squad players:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to import squad players'
      );
    } finally {
      setImportingSquadPlayers(false);
    }
  };

  const handlePlayerUpdate = async (playerId: string, updates: any) => {
    try {
      // This would be implemented in a future version
      console.log('Updating player', playerId, updates);
      // For now just show an alert
      alert(
        'Player update functionality will be available in a future version'
      );
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Failed to update player');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">
          Error Loading Match Players
        </h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render no data state
  if (!matchData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">No Player Data Available</h2>
        <p>This match doesn't have any players associated with it yet.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={importSquadPlayers}
            disabled={importingSquadPlayers}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
          >
            {importingSquadPlayers ? (
              <>
                <FaUsers className="mr-2 animate-spin" />
                Importing from Squad...
              </>
            ) : (
              <>
                <FaUsers className="mr-2" />
                Import from Squad API
              </>
            )}
          </button>
          <button
            onClick={importPlayers}
            disabled={importingPlayers}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
          >
            {importingPlayers ? (
              <>
                <FaSync className="mr-2 animate-spin" />
                Importing from Lineup...
              </>
            ) : (
              <>
                <FaSync className="mr-2" />
                Import from Lineup API
              </>
            )}
          </button>
          <Link
            href={`/admin/matches`}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md flex items-center"
          >
            <FaArrowLeft className="mr-2" />
            Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  const { match, teamAPlayers, teamBPlayers, otherPlayers, totalPlayers } =
    matchData;

  const getPlayersByTab = () => {
    switch (activeTab) {
      case 'teamA':
        return teamAPlayers;
      case 'teamB':
        return teamBPlayers;
      case 'other':
        return otherPlayers;
      default:
        return teamAPlayers;
    }
  };

  const getTeamName = () => {
    switch (activeTab) {
      case 'teamA':
        return match.teamA.name;
      case 'teamB':
        return match.teamB.name;
      case 'other':
        return 'Other Players';
      default:
        return '';
    }
  };

  const displayPlayers = getPlayersByTab();

  // Convert role string to a more readable format
  const formatRole = (role: string | null) => {
    if (!role) return 'Unknown';

    switch (role.toLowerCase()) {
      case 'batsman':
        return 'Batsman';
      case 'bat':
        return 'Batsman';
      case 'bowler':
        return 'Bowler';
      case 'bowl':
        return 'Bowler';
      case 'allrounder':
        return 'All-rounder';
      case 'ar':
        return 'All-rounder';
      case 'wicketkeeper':
        return 'Wicket-keeper';
      case 'wk':
        return 'Wicket-keeper';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  // Get CSS class for role badges
  const getRoleBadgeClass = (role: string | null) => {
    if (!role) return 'bg-gray-100 text-gray-800';

    switch (role.toLowerCase()) {
      case 'batsman':
      case 'bat':
        return 'bg-blue-100 text-blue-800';
      case 'bowler':
      case 'bowl':
        return 'bg-green-100 text-green-800';
      case 'allrounder':
      case 'ar':
        return 'bg-purple-100 text-purple-800';
      case 'wicketkeeper':
      case 'wk':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{match.name}</h1>
          <p className="text-gray-600">Player Management</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={importSquadPlayers}
            disabled={importingSquadPlayers}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
          >
            {importingSquadPlayers ? (
              <>
                <FaUsers className="mr-2 animate-spin" />
                Importing from Squad...
              </>
            ) : (
              <>
                <FaUsers className="mr-2" />
                Import from Squad
              </>
            )}
          </button>
          <button
            onClick={importPlayers}
            disabled={importingPlayers}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
          >
            {importingPlayers ? (
              <>
                <FaSync className="mr-2 animate-spin" />
                Importing from Lineup...
              </>
            ) : (
              <>
                <FaSync className="mr-2" />
                Import from Lineup
              </>
            )}
          </button>
          <Link
            href={`/admin/matches`}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md flex items-center"
          >
            <FaArrowLeft className="mr-2" />
            Back to Matches
          </Link>
        </div>
      </div>

      {/* Player Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Players</div>
          <div className="text-2xl font-bold">{totalPlayers}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">{match.teamA.name}</div>
          <div className="text-2xl font-bold">{teamAPlayers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">{match.teamB.name}</div>
          <div className="text-2xl font-bold">{teamBPlayers.length}</div>
        </div>
      </div>

      {/* Team Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('teamA')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'teamA'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {match.teamA.name} ({teamAPlayers.length})
            </button>
            <button
              onClick={() => setActiveTab('teamB')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'teamB'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {match.teamB.name} ({teamBPlayers.length})
            </button>
            {otherPlayers.length > 0 && (
              <button
                onClick={() => setActiveTab('other')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'other'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Other Players ({otherPlayers.length})
              </button>
            )}
          </nav>
        </div>

        {/* Player Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Style
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayPlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No players found for {getTeamName()}
                  </td>
                </tr>
              ) : (
                displayPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {player.player.image ? (
                          <img
                            src={player.player.image}
                            alt={player.player.name}
                            className="h-10 w-10 rounded-full mr-3"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                'none';
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center text-gray-500">
                            {player.player.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {player.player.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {player.player.teamName || 'Unknown Team'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(
                          player.player.role
                        )}`}
                      >
                        {formatRole(player.player.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {player.player.battingStyle && (
                          <div>Bat: {player.player.battingStyle}</div>
                        )}
                        {player.player.bowlingStyle && (
                          <div>Bowl: {player.player.bowlingStyle}</div>
                        )}
                        {!player.player.battingStyle &&
                          !player.player.bowlingStyle &&
                          'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {player.selected && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Selected
                          </span>
                        )}
                        {player.isSubstitute && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Substitute
                          </span>
                        )}
                        {player.isCaptain && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            Captain
                          </span>
                        )}
                        {player.isViceCaptain && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                            Vice-Captain
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() =>
                            handlePlayerUpdate(player.id, {
                              selected: !player.selected,
                            })
                          }
                          className="text-blue-600 hover:text-blue-900"
                          title={
                            player.selected
                              ? 'Remove from lineup'
                              : 'Add to lineup'
                          }
                        >
                          <FaStar />
                        </button>
                        <button
                          onClick={() =>
                            handlePlayerUpdate(player.id, {
                              isCaptain: !player.isCaptain,
                            })
                          }
                          className="text-yellow-600 hover:text-yellow-900"
                          title={
                            player.isCaptain ? 'Remove captain' : 'Make captain'
                          }
                        >
                          <FaCrown />
                        </button>
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/players/${player.playerId}/edit`
                            )
                          }
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit player"
                        >
                          <FaEdit />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
