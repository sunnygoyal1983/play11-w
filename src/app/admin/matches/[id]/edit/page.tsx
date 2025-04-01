'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface Match {
  id: string;
  name: string;
  format: string;
  venue: string;
  startTime: string;
  status: string;
  teamAName: string;
  teamBName: string;
  isActive: boolean;
}

export default function EditMatch({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formattedDate, setFormattedDate] = useState('');
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const response = await fetch(`/api/matches/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch match');
        }
        const data = await response.json();
        setMatch(data.match);

        // Format date and time for the input fields
        const startTime = new Date(data.match.startTime);
        setFormattedDate(format(startTime, 'yyyy-MM-dd'));
        setFormattedTime(format(startTime, 'HH:mm'));
      } catch (err) {
        setError('Failed to load match data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;

    try {
      // Combine date and time into a single ISO string
      const dateTimeString = `${formattedDate}T${formattedTime}:00`;
      const updatedMatch = {
        ...match,
        startTime: new Date(dateTimeString).toISOString(),
      };

      const response = await fetch(`/api/matches/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedMatch),
      });

      if (!response.ok) {
        throw new Error('Failed to update match');
      }

      router.push('/admin/matches');
    } catch (err) {
      setError('Failed to update match');
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );

  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!match) return <div className="p-4">Match not found</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Match</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white p-6 rounded-lg shadow-md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="name">Match Name</Label>
            <Input
              id="name"
              value={match.name}
              onChange={(e) => setMatch({ ...match, name: e.target.value })}
              placeholder="e.g. India vs Australia"
              required
            />
          </div>

          <div>
            <Label htmlFor="format">Format</Label>
            <Select
              value={match.format}
              onValueChange={(value) => setMatch({ ...match, format: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="T20">T20</SelectItem>
                <SelectItem value="ODI">ODI</SelectItem>
                <SelectItem value="TEST">Test</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="teamAName">Team A</Label>
            <Input
              id="teamAName"
              value={match.teamAName}
              onChange={(e) =>
                setMatch({ ...match, teamAName: e.target.value })
              }
              placeholder="e.g. India"
              required
            />
          </div>

          <div>
            <Label htmlFor="teamBName">Team B</Label>
            <Input
              id="teamBName"
              value={match.teamBName}
              onChange={(e) =>
                setMatch({ ...match, teamBName: e.target.value })
              }
              placeholder="e.g. Australia"
              required
            />
          </div>

          <div>
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={match.venue}
              onChange={(e) => setMatch({ ...match, venue: e.target.value })}
              placeholder="e.g. Melbourne Cricket Ground"
              required
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={match.status}
              onValueChange={(value) => setMatch({ ...match, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formattedDate}
              onChange={(e) => setFormattedDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={formattedTime}
              onChange={(e) => setFormattedTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/matches')}
          >
            Cancel
          </Button>
          <Button type="submit">Update Match</Button>
        </div>
      </form>
    </div>
  );
}
