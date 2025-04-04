'use client';

import { useState } from 'react';

export default function TestImportPage() {
  const [entityType, setEntityType] = useState('tournaments');
  const [tournamentId, setTournamentId] = useState('');
  const [matchId, setMatchId] = useState('');
  const [limit, setLimit] = useState('10');
  const [includePlayers, setIncludePlayers] = useState(true);
  const [forceImport, setForceImport] = useState(false);
  const [importMethod, setImportMethod] = useState<
    'standard' | 'match-players' | 'squad-players'
  >('standard');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Choose API endpoint based on import method
      let url;
      switch (importMethod) {
        case 'match-players':
          url = `/api/import-matchplayers${
            matchId ? `?matchId=${matchId}` : ''
          }`;
          break;
        case 'squad-players':
          url = `/api/import-squad-players${
            matchId ? `?matchId=${matchId}` : '?'
          }${matchId ? '&' : ''}limit=${limit}`;
          break;
        default:
          // Standard import API
          const response = await fetch('/api/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              entityType,
              ...(tournamentId ? { tournamentId } : {}),
              includePlayers,
              force: forceImport,
            }),
          });

          const data = await response.json();
          setResult(data);
          setLoading(false);
          return;
      }

      // For match-players and squad-players methods
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Generate the GET URL based on current form values
  const getImportUrl = () => {
    switch (importMethod) {
      case 'match-players':
        return `/api/import-matchplayers${
          matchId ? `?matchId=${matchId}` : ''
        }`;
      case 'squad-players':
        return `/api/import-squad-players${
          matchId ? `?matchId=${matchId}` : '?'
        }${matchId ? '&' : ''}limit=${limit}`;
      default:
        return `/api/import?action=import&entityType=${entityType}${
          tournamentId ? `&tournamentId=${tournamentId}` : ''
        }${includePlayers ? '&includePlayers=true' : ''}${
          forceImport ? '&force=true' : ''
        }`;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Import API</h1>

      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Import Method</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setImportMethod('standard')}
            className={`px-4 py-2 rounded ${
              importMethod === 'standard'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
          >
            Standard Import
          </button>
          <button
            onClick={() => setImportMethod('match-players')}
            className={`px-4 py-2 rounded ${
              importMethod === 'match-players'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
          >
            Match Lineup Import
          </button>
          <button
            onClick={() => setImportMethod('squad-players')}
            className={`px-4 py-2 rounded ${
              importMethod === 'squad-players'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
          >
            Squad Players Import
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded">
        {importMethod === 'standard' ? (
          /* Standard Import Form */
          <>
            <div className="mb-4">
              <label className="block mb-2">
                Entity Type:
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="ml-2 p-2 border rounded"
                >
                  <option value="tournaments">Tournaments</option>
                  <option value="teams">Teams</option>
                  <option value="matches">Matches</option>
                  <option value="players">Players</option>
                  <option value="all">All</option>
                </select>
              </label>
            </div>

            <div className="mb-4">
              <label className="block mb-2">
                Tournament ID (optional):
                <input
                  type="text"
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                  className="ml-2 p-2 border rounded"
                  placeholder="Enter tournament ID"
                />
              </label>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includePlayers}
                  onChange={(e) => setIncludePlayers(e.target.checked)}
                  className="mr-2"
                />
                Include Match Players
                <span className="ml-2 text-sm text-gray-500">
                  (Fetches detailed match data with player lineups)
                </span>
              </label>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forceImport}
                  onChange={(e) => setForceImport(e.target.checked)}
                  className="mr-2"
                />
                Force Re-Import
                <span className="ml-2 text-sm text-gray-500">
                  (Re-import data even if it already exists)
                </span>
              </label>
            </div>
          </>
        ) : (
          /* Match/Squad Players Import Form */
          <>
            <div className="mb-4">
              <label className="block mb-2">
                Match ID (optional):
                <input
                  type="text"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  className="ml-2 p-2 border rounded"
                  placeholder="Enter match ID or leave empty for bulk import"
                />
                <p className="text-sm text-gray-500 mt-1">
                  If left empty, will import players for upcoming matches
                  without players
                </p>
              </label>
            </div>

            {importMethod === 'squad-players' && (
              <div className="mb-4">
                <label className="block mb-2">
                  Limit (max matches to process):
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="ml-2 p-2 border rounded"
                    min="1"
                    max="50"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Maximum number of matches to process (only applies when no
                  specific match ID is provided)
                </p>
              </div>
            )}

            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">
                About this import method:
              </h3>
              <p className="text-sm text-blue-800">
                {importMethod === 'match-players'
                  ? 'This method imports players from match lineups. It works best for matches that are in progress or recently completed.'
                  : 'This method imports players from team squads based on the season. It works best for upcoming matches where lineups are not available yet.'}
              </p>
            </div>
          </>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Import Data'}
          </button>

          <a
            href={getImportUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 text-white px-4 py-2 rounded inline-block"
          >
            Open Import URL
          </a>
        </div>
      </form>

      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-300 rounded">
          <h2 className="font-bold text-red-800">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
