'use client';

import { useState, FormEvent } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ImportScheduler from './ImportScheduler';
import { UserRole } from '@prisma/client';

// Entity types for import
const ENTITY_TYPES = [
  { value: 'tournaments', label: 'Tournaments' },
  { value: 'teams', label: 'Teams' },
  { value: 'matches', label: 'Matches' },
  { value: 'players', label: 'Players' },
];

// Import methods
const IMPORT_METHODS = [
  { value: 'standard', label: 'Standard Import' },
  { value: 'match-players', label: 'Match Players' },
  { value: 'squad-players', label: 'Squad Players' },
  { value: 'scheduler', label: 'Data Scheduler' },
];

export default async function TestImportPage() {
  // Check authorization
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;

  // Only admins can access this page
  if (!session?.user || userRole !== 'ADMIN') {
    notFound();
  }

  return (
    <div className={styles.container}>
      <h1>Data Import Tools</h1>

      <div className={styles.tabs}>
        <Link href="/test-import" className={styles.active}>
          Import Tools
        </Link>
      </div>

      <div className={styles.content}>
        <ManualImport />

        <div className={styles.divider}>
          <hr />
          <span>OR</span>
          <hr />
        </div>

        <ImportScheduler />
      </div>
    </div>
  );
}

function ManualImport() {
  const [entityType, setEntityType] = useState('tournaments');
  const [tournamentId, setTournamentId] = useState('');
  const [matchId, setMatchId] = useState('');
  const [limit, setLimit] = useState('10');
  const [includePlayers, setIncludePlayers] = useState(false);
  const [forceImport, setForceImport] = useState(false);
  const [importMethod, setImportMethod] = useState('standard');
  const [schedulerTask, setSchedulerTask] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      let url = '';

      // Handle different import methods
      if (importMethod === 'scheduler') {
        // Scheduler API
        url = `/api/scheduler?task=${schedulerTask}${
          forceImport ? '&force=true' : ''
        }`;
      } else if (importMethod === 'standard') {
        // Standard import
        url = `/api/import?entityType=${entityType}`;

        if (tournamentId) {
          url += `&tournamentId=${tournamentId}`;
        }

        if (limit) {
          url += `&limit=${limit}`;
        }

        if (includePlayers) {
          url += '&includePlayers=true';
        }

        if (forceImport) {
          url += '&forceImport=true';
        }
      } else if (importMethod === 'match-players') {
        // Match players import
        if (!matchId) {
          throw new Error('Match ID is required for match players import');
        }
        url = `/api/import/match-players?matchId=${matchId}`;

        if (forceImport) {
          url += '&forceImport=true';
        }
      } else if (importMethod === 'squad-players') {
        // Squad players import
        if (!tournamentId) {
          throw new Error('Tournament ID is required for squad players import');
        }
        url = `/api/import/squad-players?tournamentId=${tournamentId}`;

        if (forceImport) {
          url += '&forceImport=true';
        }
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'An error occurred during import');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.importForm}>
      <h2>Manual Data Import</h2>

      <form onSubmit={handleSubmit}>
        <div className={styles.formControl}>
          <label>Import Method:</label>
          <select
            value={importMethod}
            onChange={(e) => setImportMethod(e.target.value)}
          >
            {IMPORT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        {importMethod === 'standard' && (
          <>
            <div className={styles.formControl}>
              <label>Entity Type:</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              >
                {ENTITY_TYPES.map((entity) => (
                  <option key={entity.value} value={entity.value}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formControl}>
              <label>Tournament ID (optional):</label>
              <input
                type="text"
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                placeholder="Leave empty for all tournaments"
              />
            </div>

            <div className={styles.formControl}>
              <label>Limit:</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                min="1"
                max="50"
              />
            </div>

            <div className={styles.checkboxControl}>
              <input
                type="checkbox"
                id="includePlayers"
                checked={includePlayers}
                onChange={(e) => setIncludePlayers(e.target.checked)}
              />
              <label htmlFor="includePlayers">Include Players</label>
            </div>
          </>
        )}

        {importMethod === 'match-players' && (
          <div className={styles.formControl}>
            <label>Match ID:</label>
            <input
              type="text"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              placeholder="Enter match ID"
              required
            />
          </div>
        )}

        {importMethod === 'squad-players' && (
          <div className={styles.formControl}>
            <label>Tournament ID:</label>
            <input
              type="text"
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              placeholder="Enter tournament ID"
              required
            />
          </div>
        )}

        {importMethod === 'scheduler' && (
          <div className={styles.formControl}>
            <label>Scheduler Task:</label>
            <select
              value={schedulerTask}
              onChange={(e) => setSchedulerTask(e.target.value)}
            >
              <option value="all">All Tasks</option>
              <option value="live">Live Matches Only</option>
              <option value="upcoming">Upcoming Matches Only</option>
              <option value="players">Players for Upcoming Matches</option>
            </select>
            <p className={styles.hint}>
              The scheduler updates live matches every 10 minutes, upcoming
              matches every hour, and players for upcoming matches every 4
              hours.
            </p>
          </div>
        )}

        <div className={styles.checkboxControl}>
          <input
            type="checkbox"
            id="forceImport"
            checked={forceImport}
            onChange={(e) => setForceImport(e.target.checked)}
          />
          <label htmlFor="forceImport">Force Import (ignore cache)</label>
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? 'Importing...' : 'Start Import'}
        </button>
      </form>

      {error && (
        <div className={styles.error}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className={styles.result}>
          <h3>Import Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
