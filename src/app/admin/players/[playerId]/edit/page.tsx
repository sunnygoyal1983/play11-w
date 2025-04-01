'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Player {
  id: string;
  name: string;
  role: string;
  country: string;
  teamName: string;
  battingStyle: string;
  bowlingStyle: string;
  credits: number;
  imageUrl: string;
}

export default function EditPlayer({ params }: { params: { playerId: string } }) {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const response = await fetch(`/api/players/${params.playerId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch player');
        }
        const data = await response.json();
        setPlayer(data.player);
      } catch (err) {
        setError('Failed to load player data');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [params.playerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;

    try {
      const response = await fetch(`/api/players/${params.playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(player),
      });

      if (!response.ok) {
        throw new Error('Failed to update player');
      }

      router.push('/admin/players');
    } catch (err) {
      setError('Failed to update player');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!player) return <div>Player not found</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Player</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={player.name}
            onChange={(e) => setPlayer({ ...player, name: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <Select
            value={player.role}
            onValueChange={(value) => setPlayer({ ...player, role: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BATSMAN">Batsman</SelectItem>
              <SelectItem value="BOWLER">Bowler</SelectItem>
              <SelectItem value="ALL_ROUNDER">All Rounder</SelectItem>
              <SelectItem value="WICKET_KEEPER">Wicket Keeper</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={player.country}
            onChange={(e) => setPlayer({ ...player, country: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="teamName">Team Name</Label>
          <Input
            id="teamName"
            value={player.teamName}
            onChange={(e) => setPlayer({ ...player, teamName: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="battingStyle">Batting Style</Label>
          <Select
            value={player.battingStyle}
            onValueChange={(value) => setPlayer({ ...player, battingStyle: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select batting style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RIGHT">Right Handed</SelectItem>
              <SelectItem value="LEFT">Left Handed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="bowlingStyle">Bowling Style</Label>
          <Select
            value={player.bowlingStyle}
            onValueChange={(value) => setPlayer({ ...player, bowlingStyle: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select bowling style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FAST">Fast</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="SPIN">Spin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="credits">Credits</Label>
          <Input
            id="credits"
            type="number"
            value={player.credits}
            onChange={(e) => setPlayer({ ...player, credits: Number(e.target.value) })}
          />
        </div>

        <Button type="submit">Update Player</Button>
      </form>
    </div>
  );
}