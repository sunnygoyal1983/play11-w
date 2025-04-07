'use client';

import React, { useState } from 'react';
import {
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Chip,
  Box,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';

// Tasks and their descriptions
const SCHEDULER_TASKS = [
  {
    value: 'all',
    label: 'All Tasks',
    description: 'Run all available scheduler tasks',
  },
  {
    value: 'live',
    label: 'Live Matches',
    description:
      'Import and update data for currently live matches (every 10 min)',
  },
  {
    value: 'upcoming',
    label: 'Upcoming Matches',
    description: 'Import data for upcoming matches (every hour)',
  },
  {
    value: 'players',
    label: 'Player Data',
    description: 'Update player data for upcoming matches (every 4 hours)',
  },
];

interface TaskResult {
  status?: string;
  count?: number;
  processed?: any[];
  matchesProcessed?: number;
  matchesWithPlayers?: number;
  reason?: string;
  lastUpdate?: string;
  error?: string;
}

interface SchedulerResult {
  success: boolean;
  message: string;
  tasks: Record<string, TaskResult>;
  timestamp: string;
  error?: string;
}

export default function ImportScheduler() {
  const [selectedTask, setSelectedTask] = useState<string>('all');
  const [forceImport, setForceImport] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SchedulerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunScheduler = () => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Construct API URL with query parameters
    const url = `/api/scheduler?task=${selectedTask}${
      forceImport ? '&force=true' : ''
    }`;

    // Call the scheduler API
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(
            data.error || 'An error occurred while running the scheduler'
          );
        } else {
          setResult(data);
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'An unexpected error occurred'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  // Render task result card
  const renderTaskResult = (taskKey: string, taskData: TaskResult) => {
    if (!taskData) return null;

    // Determine status and icon
    let statusColor = 'primary';
    let StatusIcon = TaskAltIcon;

    if (taskData.status === 'skipped') {
      statusColor = 'info';
      StatusIcon = HourglassTopIcon;
    } else if (taskData.status === 'error' || taskData.error) {
      statusColor = 'error';
      StatusIcon = ErrorIcon;
    }

    const taskLabel =
      SCHEDULER_TASKS.find(
        (t) =>
          t.value === taskKey ||
          (taskKey === 'liveMatches' && t.value === 'live') ||
          (taskKey === 'upcomingMatches' && t.value === 'upcoming') ||
          (taskKey === 'playerUpdate' && t.value === 'players')
      )?.label || taskKey;

    return (
      <Paper key={taskKey} elevation={1} sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <StatusIcon color={statusColor as any} />
          <Typography variant="h6">{taskLabel}</Typography>
          {taskData.status && (
            <Chip
              label={taskData.status.toUpperCase()}
              color={statusColor as any}
              size="small"
              sx={{ ml: 'auto' }}
            />
          )}
        </Stack>

        <Divider sx={{ my: 1 }} />

        {taskData.status === 'skipped' ? (
          <Box>
            <Typography variant="body2">{taskData.reason}</Typography>
            <Typography variant="body2" color="text.secondary">
              Last update: {formatDate(taskData.lastUpdate)}
            </Typography>
          </Box>
        ) : taskData.status === 'error' || taskData.error ? (
          <Typography color="error">
            {taskData.error || 'An error occurred while processing this task'}
          </Typography>
        ) : (
          <Box>
            {taskData.count !== undefined && (
              <Typography>Total items: {taskData.count}</Typography>
            )}

            {taskData.processed?.length && (
              <Typography>
                Processed: {taskData.processed.length} items
              </Typography>
            )}

            {taskData.matchesProcessed !== undefined && (
              <Typography>
                Matches processed: {taskData.matchesProcessed}
              </Typography>
            )}

            {taskData.matchesWithPlayers !== undefined && (
              <Typography>
                Matches updated with players: {taskData.matchesWithPlayers}
              </Typography>
            )}
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <div>
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <ScheduleIcon color="primary" />
          <Typography variant="h5">Data Import Scheduler</Typography>
        </Stack>

        <Typography variant="body1" paragraph>
          The scheduler automatically imports data for live and upcoming
          matches, including player information. You can manually trigger these
          tasks below.
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          {SCHEDULER_TASKS.map((task) => (
            <Button
              key={task.value}
              variant={selectedTask === task.value ? 'contained' : 'outlined'}
              onClick={() => setSelectedTask(task.value)}
              sx={{ minWidth: '120px' }}
            >
              {task.label}
            </Button>
          ))}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {SCHEDULER_TASKS.find((t) => t.value === selectedTask)?.description ||
            ''}
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            onClick={handleRunScheduler}
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={20} /> : <AccessTimeIcon />
            }
          >
            {loading ? 'Running...' : 'Run Scheduler Task'}
          </Button>

          <Button
            variant={forceImport ? 'contained' : 'outlined'}
            color="secondary"
            onClick={() => setForceImport(!forceImport)}
            disabled={loading}
          >
            {forceImport ? 'Force Import: ON' : 'Force Import: OFF'}
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <div>
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Scheduler Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Task Completed: {formatDate(result.timestamp)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {result.message}
            </Typography>
          </Paper>

          {Object.entries(result.tasks).map(([key, value]) =>
            renderTaskResult(key, value)
          )}
        </div>
      )}
    </div>
  );
}
