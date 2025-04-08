'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

export default function PrizeMonitorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(false);
  const [issues, setIssues] = useState<any>([]);
  const [expandedContest, setExpandedContest] = useState<string | null>(null);
  const [fixingContest, setFixingContest] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else {
      fetchMonitoringData();
    }
  }, [status, router, session]);

  // Fetch monitoring data
  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/monitor-prize-distribution');

      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const data = await response.json();
      setIssues(data.issues || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      toast.error('Failed to load prize monitoring data');
      setLoading(false);
    }
  };

  // Run monitoring manually
  const runMonitoring = async () => {
    try {
      setMonitoring(true);
      const response = await fetch(
        '/api/admin/monitor-prize-distribution?days=30'
      );

      if (!response.ok) {
        throw new Error('Failed to run monitoring');
      }

      const data = await response.json();
      setIssues(data.issues || []);
      toast.success(
        `Monitoring completed. Found ${data.totalIssuesFound} issues.`
      );
      setMonitoring(false);
    } catch (error) {
      console.error('Error running monitoring:', error);
      toast.error('Failed to run prize monitoring');
      setMonitoring(false);
    }
  };

  // Fix prize distribution for a contest
  const fixPrizeDistribution = async (contestId: string) => {
    try {
      setFixingContest(contestId);
      const response = await fetch(
        '/api/admin/monitor-prize-distribution/fix',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contestId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fix prize distribution');
      }

      const data = await response.json();
      toast.success(data.message || 'Fixed prize distribution successfully');

      // Refresh monitoring data
      await fetchMonitoringData();
      setFixingContest(null);
    } catch (error) {
      console.error('Error fixing prize distribution:', error);
      toast.error('Failed to fix prize distribution');
      setFixingContest(null);
    }
  };

  // Toggle expanded contest
  const toggleExpandContest = (contestId: string) => {
    if (expandedContest === contestId) {
      setExpandedContest(null);
    } else {
      setExpandedContest(contestId);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Prize Distribution Monitor</h1>
          <Button
            onClick={runMonitoring}
            disabled={monitoring}
            className="flex items-center gap-2"
          >
            {monitoring && (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            )}
            Run Monitoring
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              Monitor for missed prize distributions in contests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              This tool identifies contest entries that should have received
              prizes but didn't. These are entries where rank ≤ winnerCount but
              winAmount = 0.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">
                  Total Contests with Issues
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {issues.length}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Total Affected Entries</p>
                <p className="text-2xl font-bold text-amber-700">
                  {issues.reduce(
                    (sum: number, contest: any) => sum + contest.totalEntries,
                    0
                  )}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Last Checked</p>
                <p className="text-lg font-bold text-green-700">
                  {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {issues.length === 0 ? (
          <div className="text-center p-10 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No prize distribution issues found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {issues.map((contest: any) => (
              <Card key={contest.contestId}>
                <CardHeader className="bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{contest.contestName}</CardTitle>
                      <CardDescription>
                        Match: {contest.matchName} • Ended:{' '}
                        {contest.matchEndTime
                          ? format(
                              new Date(contest.matchEndTime),
                              'MMM dd, yyyy HH:mm'
                            )
                          : 'Unknown'}
                      </CardDescription>
                    </div>
                    <Badge variant="destructive" className="text-sm">
                      {contest.totalEntries} Affected
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpandContest(contest.contestId)}
                    >
                      {expandedContest === contest.contestId
                        ? 'Hide Details'
                        : 'Show Details'}
                    </Button>
                    <Button
                      onClick={() => fixPrizeDistribution(contest.contestId)}
                      disabled={fixingContest === contest.contestId}
                      className="flex items-center gap-2"
                    >
                      {fixingContest === contest.contestId && (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      )}
                      Fix All Prizes
                    </Button>
                  </div>

                  {expandedContest === contest.contestId && (
                    <div className="bg-gray-50 p-4 rounded-lg mt-2">
                      <h3 className="text-md font-semibold mb-2">
                        Affected Entries
                      </h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rank</TableHead>
                              <TableHead>User</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead className="text-right">
                                Missed Amount
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contest.entries.map((entry: any) => (
                              <TableRow key={entry.entryId}>
                                <TableCell className="font-medium">
                                  {entry.rank}
                                </TableCell>
                                <TableCell>{entry.userName}</TableCell>
                                <TableCell className="text-gray-500 text-sm">
                                  {entry.userEmail}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      entry.userRole === 'ADMIN'
                                        ? 'default'
                                        : 'outline'
                                    }
                                  >
                                    {entry.userRole}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  ₹{entry.missedPrizeAmount}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-gray-50 text-xs text-gray-500">
                  Contest ID: {contest.contestId}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
