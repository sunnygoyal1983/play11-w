'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Paper,
  Typography,
  Alert,
  LinearProgress,
  Stack,
  CircularProgress,
} from '@mui/material';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function WalletFixPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<{
    running: boolean;
    nextRun: string | null;
    lastRun: string | null;
  }>({
    running: false,
    nextRun: null,
    lastRun: null,
  });
  const [alert, setAlert] = useState<{
    severity: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    // Redirect if not admin
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    // Check scheduler status
    const checkSchedulerStatus = async () => {
      try {
        // Import the scheduler module
        const { getWalletFixSchedulerStatus } = await import(
          '@/services/wallet-fix-scheduler'
        );
        const status = getWalletFixSchedulerStatus();
        setSchedulerStatus({
          running: status.running,
          nextRun: status.nextRun
            ? new Date(status.nextRun).toLocaleString()
            : null,
          lastRun: status.lastRun
            ? new Date(status.lastRun).toLocaleString()
            : null,
        });
      } catch (error) {
        console.error('Error checking scheduler status:', error);
      }
    };

    checkSchedulerStatus();
    // Set up interval to check status every 5 seconds
    const interval = setInterval(checkSchedulerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRunFix = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Call the wallet fix API
      const response = await fetch('/api/cron/fix-wallet-transactions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error running wallet fix:', error);
      setResult({ success: false, error: 'Failed to run wallet fix' });
    } finally {
      setLoading(false);
    }
  };

  const handleForceRestart = async () => {
    setLoading(true);
    try {
      // Import the scheduler module
      const { stopWalletFixScheduler, startWalletFixScheduler } = await import(
        '@/services/wallet-fix-scheduler'
      );

      // Stop the current scheduler if running
      stopWalletFixScheduler();

      // Start with 15 minute interval in development, 60 in production
      const intervalMinutes = 1; // Force a 1 minute interval for immediate results
      await startWalletFixScheduler(intervalMinutes);

      setResult({
        success: true,
        message: `Wallet fix scheduler has been restarted with ${intervalMinutes} minute interval`,
      });
    } catch (error) {
      console.error('Error restarting scheduler:', error);
      setResult({
        success: false,
        error: 'Failed to restart scheduler',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForceFix = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cron/force-fix-wallet', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setAlert({
          severity: 'success',
          message: `Successfully fixed ${data.fixedCount} missing transactions`,
        });
      } else {
        setAlert({
          severity: 'error',
          message: 'Failed to fix transactions: ' + data.error,
        });
      }
    } catch (error) {
      setAlert({
        severity: 'error',
        message: 'Error fixing transactions: ' + error,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStopScheduler = async () => {
    try {
      const response = await fetch('/api/admin/stop-wallet-fix', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setAlert({
          severity: 'success',
          message: 'Wallet fix scheduler stopped successfully',
        });
        // Update scheduler status
        setSchedulerStatus((prev) => ({
          ...prev,
          running: false,
          nextRun: null,
        }));
      } else {
        setAlert({
          severity: 'error',
          message: 'Failed to stop scheduler: ' + data.error,
        });
      }
    } catch (error) {
      setAlert({
        severity: 'error',
        message: 'Error stopping scheduler: ' + error,
      });
    }
  };

  if (
    status === 'loading' ||
    (status === 'authenticated' && session?.user?.role !== 'ADMIN')
  ) {
    return (
      <AdminLayout>
        <Container maxWidth="lg">
          <Box sx={{ my: 4 }}>
            <Typography variant="h4">Loading...</Typography>
          </Box>
        </Container>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Wallet Transaction Fix
          </Typography>

          <Alert severity="warning" sx={{ mb: 3 }}>
            This page provides tools to fix missing wallet transactions for
            contest winners. The system should handle this automatically, but
            these tools can help if you notice any issues.
          </Alert>

          {alert && (
            <Alert severity={alert.severity} className="mb-4">
              {alert.message}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Scheduler Status
                </Typography>
                <Box>
                  <Typography variant="body1">
                    <strong>Running:</strong>{' '}
                    {schedulerStatus.running ? 'Yes' : 'No'}
                  </Typography>
                  {schedulerStatus.lastRun && (
                    <Typography variant="body1">
                      <strong>Last Run:</strong> {schedulerStatus.lastRun}
                    </Typography>
                  )}
                  {schedulerStatus.nextRun && (
                    <Typography variant="body1">
                      <strong>Next Run:</strong> {schedulerStatus.nextRun}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info">
                    The wallet fix scheduler automatically runs to find and fix
                    any missing contest win transactions. In development mode,
                    it runs every 15 minutes. In production, it runs every 60
                    minutes.
                  </Alert>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleForceFix}
                      disabled={loading}
                    >
                      {loading ? (
                        <CircularProgress size={24} />
                      ) : (
                        'Run DIRECT Fix (Emergency)'
                      )}
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleStopScheduler}
                      disabled={!schedulerStatus.running}
                    >
                      Stop Scheduler
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Manual Fix Options
                </Typography>
                <Box>
                  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleRunFix}
                      disabled={loading}
                    >
                      Run Normal Fix
                    </Button>
                  </Stack>

                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Normal Fix</strong>: Uses the regular API endpoint
                    that the scheduler calls.
                    <br />
                    <strong>Direct Fix</strong>: Bypasses the scheduler and
                    directly fixes missing transactions. Use this in emergencies
                    if the scheduler isn't working.
                  </Alert>

                  {loading && (
                    <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
                      <LinearProgress />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        This may take a moment depending on how many
                        transactions need to be fixed...
                      </Typography>
                    </Box>
                  )}

                  {result && (
                    <Card sx={{ mt: 2 }}>
                      <CardContent>
                        <Typography variant="h6">Results</Typography>
                        <Alert
                          severity={result.success ? 'success' : 'error'}
                          sx={{ mb: 2 }}
                        >
                          {result.success
                            ? 'Operation completed successfully'
                            : 'Error during operation'}
                        </Alert>
                        <pre
                          style={{
                            background: '#f5f5f5',
                            padding: '10px',
                            borderRadius: '4px',
                            overflow: 'auto',
                            maxHeight: '400px',
                          }}
                        >
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </AdminLayout>
  );
}
