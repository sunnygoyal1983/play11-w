import { NextResponse } from 'next/server';
import { fetchSportsmonkData } from '../../api/sportmonk/route';

export default async function SportmonkAdminPage() {
  try {
    const matches = await fetchSportsmonkData('/cricket/matches');
    
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Cricket Match Data</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.data.map((match: any) => (
            <div key={match.id} className="border p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-2">{match.name}</h2>
              <p className="text-gray-600">Format: {match.format}</p>
              <p className="text-gray-600">Venue: {match.venue?.name}</p>
              <p className="text-gray-600">Start Time: {new Date(match.starting_at).toLocaleString()}</p>
              <div className="mt-2 pt-2 border-t">
                <p className="font-medium">{match.localteam?.name} vs {match.visitorteam?.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching matches:', error);
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Cricket Match Data</h1>
        <p className="text-red-500">Error loading match data</p>
      </div>
    );
  }
}