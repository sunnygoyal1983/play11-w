import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { FaFilter, FaSearch, FaInfoCircle, FaCrown, FaStar } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Player roles
const ROLES = {
  WK: 'Wicket Keeper',
  BAT: 'Batsman',
  AR: 'All Rounder',
  BOWL: 'Bowler'
};

// Team constraints
const CONSTRAINTS = {
  TOTAL_PLAYERS: 11,
  MAX_PLAYERS_PER_TEAM: 7,
  MIN_PLAYERS_PER_TEAM: 3,
  CREDITS: 100,
  MIN_WK: 1,
  MAX_WK: 4,
  MIN_BAT: 3,
  MAX_BAT: 6,
  MIN_AR: 1,
  MAX_AR: 4,
  MIN_BOWL: 3,
  MAX_BOWL: 6
};

// This would typically come from an API call based on the match ID
const dummyMatch = {
  id: '1',
  name: 'India vs Australia',
  format: 'T20',
  teamA: { id: 'IND', name: 'India', logo: '/team-logos/india.png' },
  teamB: { id: 'AUS', name: 'Australia', logo: '/team-logos/australia.png' },
};

// This would typically come from an API call to get players for the match
const dummyPlayers = [
  // Team A (India) players
  { id: '1', name: 'Rohit Sharma', team: 'IND', role: 'BAT', credits: 10.0, points: 150, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/rohit.png' },
  { id: '2', name: 'Virat Kohli', team: 'IND', role: 'BAT', credits: 10.5, points: 180, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/kohli.png' },
  { id: '3', name: 'KL Rahul', team: 'IND', role: 'WK', credits: 9.0, points: 120, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/rahul.png' },
  { id: '4', name: 'Rishabh Pant', team: 'IND', role: 'WK', credits: 8.5, points: 110, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/pant.png' },
  { id: '5', name: 'Hardik Pandya', team: 'IND', role: 'AR', credits: 9.5, points: 140, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/pandya.png' },
  { id: '6', name: 'Ravindra Jadeja', team: 'IND', role: 'AR', credits: 9.0, points: 130, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/jadeja.png' },
  { id: '7', name: 'Jasprit Bumrah', team: 'IND', role: 'BOWL', credits: 9.5, points: 150, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/bumrah.png' },
  { id: '8', name: 'Mohammed Shami', team: 'IND', role: 'BOWL', credits: 8.5, points: 120, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/shami.png' },
  { id: '9', name: 'Yuzvendra Chahal', team: 'IND', role: 'BOWL', credits: 8.0, points: 110, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/chahal.png' },
  { id: '10', name: 'Kuldeep Yadav', team: 'IND', role: 'BOWL', credits: 8.0, points: 100, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/kuldeep.png' },
  { id: '11', name: 'Shubman Gill', team: 'IND', role: 'BAT', credits: 8.5, points: 120, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/gill.png' },
  
  // Team B (Australia) players
  { id: '12', name: 'David Warner', team: 'AUS', role: 'BAT', credits: 10.0, points: 160, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/warner.png' },
  { id: '13', name: 'Steve Smith', team: 'AUS', role: 'BAT', credits: 10.0, points: 150, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/smith.png' },
  { id: '14', name: 'Aaron Finch', team: 'AUS', role: 'BAT', credits: 9.0, points: 130, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/finch.png' },
  { id: '15', name: 'Glenn Maxwell', team: 'AUS', role: 'AR', credits: 9.5, points: 140, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/maxwell.png' },
  { id: '16', name: 'Marcus Stoinis', team: 'AUS', role: 'AR', credits: 8.5, points: 120, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/stoinis.png' },
  { id: '17', name: 'Alex Carey', team: 'AUS', role: 'WK', credits: 8.5, points: 110, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/carey.png' },
  { id: '18', name: 'Pat Cummins', team: 'AUS', role: 'BOWL', credits: 9.0, points: 140, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/cummins.png' },
  { id: '19', name: 'Mitchell Starc', team: 'AUS', role: 'BOWL', credits: 9.0, points: 130, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/starc.png' },
  { id: '20', name: 'Josh Hazlewood', team: 'AUS', role: 'BOWL', credits: 8.5, points: 120, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/hazlewood.png' },
  { id: '21', name: 'Adam Zampa', team: 'AUS', role: 'BOWL', credits: 8.0, points: 110, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/zampa.png' },
  { id: '22', name: 'Matthew Wade', team: 'AUS', role: 'WK', credits: 8.0, points: 100, selected: false, isCaptain: false, isViceCaptain: false, image: '/player-images/wade.png' },
];

export default function CreateTeam() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id;
  
  // In a real app, we would fetch the match and players using the ID
  const match = dummyMatch;
  const [players, setPlayers] = useState(dummyPlayers);
  const [activeTab, setActiveTab] = useState('WK');
  const [selectedPlayers, setSelectedPlayers] = useState<typeof dummyPlayers>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamName, setTeamName] = useState('');
  const [showCaptainSelection, setShowCaptainSelection] = useState(false);
  
  // Calculate team statistics
  const teamStats = {
    totalPlayers: selectedPlayers.length,
    totalCredits: selectedPlayers.reduce((sum, player) => sum + player.credits, 0),
    teamACounts: selectedPlayers.filter(p => p.team === match.teamA.id).length,
    teamBCounts: selectedPlayers.filter(p => p.team === match.teamB.id).length,
    roleCounts: {
      WK: selectedPlayers.filter(p => p.role === 'WK').length,
      BAT: selectedPlayers.filter(p => p.role === 'BAT').length,
      AR: selectedPlayers.filter(p => p.role === 'AR').length,
      BOWL: selectedPlayers.filter(p => p.role === 'BOWL').length,
    }
  };
  
  // Filter players based on active tab and search query
  const filteredPlayers = players.filter(player => {
    const matchesTab = activeTab === player.role;
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });
  
  // Check if player can be selected based on team constraints
  const canSelectPlayer = (player: typeof dummyPlayers[0]) => {
    if (teamStats.totalPlayers >= CONSTRAINTS.TOTAL_PLAYERS) {
      return false;
    }
    
    // Check team limits
    if (player.team === match.teamA.id && teamStats.teamACounts >= CONSTRAINTS.MAX_PLAYERS_PER_TEAM) {
      return false;
    }
    if (player.team === match.teamB.id && teamStats.teamBCounts >= CONSTRAINTS.MAX_PLAYERS_PER_TEAM) {
      return false;
    }
    
    // Check role limits
    if (player.role === 'WK' && teamStats.roleCounts.WK >= CONSTRAINTS.MAX_WK) {
      return false;
    }
    if (player.role === 'BAT' && teamStats.roleCounts.BAT >= CONSTRAINTS.MAX_BAT) {
      return false;
    }
    if (player.role === 'AR' && teamStats.roleCounts.AR >= CONSTRAINTS.MAX_AR) {
      return false;
    }
    if (player.role === 'BOWL' && teamStats.roleCounts.BOWL >= CONSTRAINTS.MAX_BOWL) {
      return false;
    }
    
    // Check credits
    if (teamStats.totalCredits + player.credits > CONSTRAINTS.CREDITS) {
      return false;
    }
    
    return true;
  };
  
  // Handle player selection/deselection
  const togglePlayerSelection = (playerId: string) => {
    const playerIndex = players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;
    
    const player = players[playerIndex];
    
    if (player.selected) {
      // Deselect player
      const updatedPlayers = players.map(p => 
        p.id === playerId ? { ...p, selected: false, isCaptain: false, isViceCaptain: false } : p
      );
      setPlayers(updatedPlayers);
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
    } else {
      // Select player if constraints allow
      if (canSelectPlayer(player)) {
        const updatedPlayers = players.map(p => 
          p.id === playerId ? { ...p, selected: true } : p
        );
        setPlayers(updatedPlayers);
        setSelectedPlayers([...selectedPlayers, { ...player, selected: true }]);
      } else {
        // Show error message
        toast.error('Cannot select this player due to team constraints');
      }
    }
  };
  
  // Set captain and vice-captain
  const setCaptain = (playerId: string) => {
    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, isCaptain: true, isViceCaptain: false } : 
      { ...p, isCaptain: false }
    );
    setPlayers(updatedPlayers);
    setSelectedPlayers(selectedPlayers.map(p => 
      p.id === playerId ? { ...p, isCaptain: true, isViceCaptain: false } : 
      { ...p, isCaptain: false }
    ));
  };
  
  const setViceCaptain = (playerId: string) => {
    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, isViceCaptain: true, isCaptain: false } : 
      { ...p, isViceCaptain: false }
    );
    setPlayers(updatedPlayers);
    setSelectedPlayers(selectedPlayers.map(p => 
      p.id === playerId ? { ...p, isViceCaptain: true, isCaptain: false } : 
      { ...p, isViceCaptain: false }
    ));
  };
  
  // Check if team is valid for submission
  const isTeamValid = () => {
    if (teamStats.totalPlayers !== CONSTRAINTS.TOTAL_PLAYERS) return false;
    if (teamStats.roleCounts.WK < CONSTRAINTS.MIN_WK) return false;
    if (teamStats.roleCounts.BAT < CONSTRAINTS.MIN_BAT) return false;
    if (teamStats.roleCounts.AR < CONSTRAINTS.MIN_AR) return false;
    if (teamStats.roleCounts.BOWL < CONSTRAINTS.MIN_BOWL) return false;
    if (teamStats.teamACounts < CONSTRAINTS.MIN_PLAYERS_PER_TEAM) return false;
    if (teamStats.teamBCounts < CONSTRAINTS.MIN_PLAYERS_PER_TEAM) return false;
    
    // Check if captain and vice-captain are selected
    if (showCaptainSelection) {
      const hasCaptain = selectedPlayers.some(p => p.isCaptain);
      const hasViceCaptain = selectedPlayers.some(p => p.isViceCaptain);
      if (!hasCaptain || !hasViceCaptain) return false;
      if (!teamName.trim()) return false;
    }
    
    return true;
  };
  
  // Handle team submission
  const handleSubmitTeam = async () => {
    if (!isTeamValid()) {
      toast.error('Please complete your team selection');
      return;
    }
    
    try {
      // In a real app, we would submit the team to the API
      toast.success('Team created successfully!');
      router.push(`/routes/matches/${matchId}`);
    } catch (error) {
      toast.error('Failed to create team');
    }
  };
  
  // Proceed to captain selection
  const proceedToCaptainSelection = () => {
    if (teamStats.totalPlayers !== CONSTRAINTS.TOTAL_PLAYERS) {
      toast.error(`Please select exactly ${CONSTRAINTS.TOTAL_PLAYERS} players`);
      return;
    }
    setShowCaptainSelection(true);
  };
  
  // Go back to player selection
  const backToPlayerSelection = () => {
    setShowCaptainSelection(false);
  };
  
  if (!match) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-xl">Match not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4">
        {/* Match Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-indigo-600 text-white p-4">
            <h1 className="text-xl font-bold mb-1">Create Team</h1>
            <div className="text-sm">{match.name} • {match.format}</div>
          </div>
          
          <div className="p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full mr-3 relative overflow-hidden">
                {match.teamA.logo && (
                  <Image
                    src={match.teamA.logo}
                    alt={match.teamA.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <span className="font-medium">{match.teamA.name}</span>
            </div>
            
            <span className="text-sm font-bold">VS</span>
            
            <div className="flex items-center">
              <span className="font-medium">{match.teamB.name}</span>
              <div className="w-12 h-12 bg-gray-200 rounded-full ml-3 relative overflow-hidden">
                {match.teamB.logo && (
                  <Image
                    src={match.teamB.logo}
                    alt={match.teamB.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Team Progress */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm text-gray-500">Players</span>
              <div className="text-lg font-bold">{teamStats.totalPlayers}/{CONSTRAINTS.TOTAL_PLAYERS}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Credits Left</span>
              <div className="text-lg font-bold">{(CONSTRAINTS.CREDITS - teamStats.totalCredits).toFixed(1)}</div>
            </div>
            <div className="flex space-x-4">
              <div>
                <span className="text-sm text-gray-500">{match.teamA.name}</span>
                <div className="text-lg font-bold">{teamStats.teamACounts}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">{match.teamB.name}</span>
                <div className="text-lg font-bold">{teamStats.teamBCounts}</div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className={`p-2 rounded ${teamStats.roleCounts.WK < CONSTRAINTS.MIN_WK ? 'bg-red-100' : 'bg-green-100'}`}>
              <div className="text-xs text-gray-600">WK</div>
              <div className="font-bold">{teamStats.roleCounts.WK}/{CONSTRAINTS.MIN_WK}-{CONSTRAINTS.MAX_WK}</div>
            </div>
            <div className={`p-2 rounded ${teamStats.roleCounts.BAT < CONSTRAINTS.MIN_BAT ? 'bg-red-100' : 'bg-green-100'}`}>
              <div className="text-xs text-gray-600">BAT</div>
              <div className="font-bold">{teamStats.roleCounts.BAT}/{CONSTRAINTS.MIN_BAT}-{CONSTRAINTS.MAX_BAT}</div>
            </div>
            <div className={`p-2 rounded ${teamStats.roleCounts.AR < CONSTRAINTS.MIN_AR ? 'bg-red-100' : 'bg-green-100'}`}>
              <div className="text-xs text-gray-600">AR</div>
              <div className="font-bold">{teamStats.roleCounts.AR}/{CONSTRAINTS.MIN_AR}-{CONSTRAINTS.MAX_AR}</div>
            </div>
            <div className={`p-2 rounded ${teamStats.roleCounts.BOWL < CONSTRAINTS.MIN_BOWL ? 'bg-red-100' : 'bg-green-100'}`}>
              <div className="text-xs text-gray-600">BOWL</div>
              <div className="font-bold">{teamStats.roleCounts.BOWL}/{CONSTRAINTS.MIN_BOWL}-{CONSTRAINTS.MAX_BOWL}</div>
            </div>
          </div>
        </div>
        
        {!showCaptainSelection ? (
          <>
            {/* Player Selection */}
            <div className="mb-6">
              {/* Search and Filter */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                <div className="flex items-center">
                  <div className="relative flex-grow">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search players..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button className="ml-2 p-2 bg-gray-100 rounded-lg">
                    <FaFilter className="text-gray-600" />
                  </button>
                </div>
              </div>
              
              {/* Player Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                {Object.entries(ROLES).map(([role, label]) => (
                  <button
                    key={role}
                    className={`py-2 px-4 font-medium ${
                      activeTab === role
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab(role)}
                  >
                    {label} ({teamStats.roleCounts[role as keyof typeof teamStats.roleCounts]})
                  </button>
                ))}
              </div>
              
              {/* Player List */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-2 bg-gray-50 border-b flex justify-between text-sm text-gray-600">
                  <div className="w-1/2">Player</div>
                  <div className="w-1/4 text-center">Points</div>
                  <div className="w-1/4 text-center">Credits</div>
                </div>
                
                <div className="divide-y">
                  {filteredPlayers.map((player) => (
                    <div 
                      key={player.id} 
                      className={`p-3 flex justify-between items-center ${
                        player.selected ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="w-1/2 flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 relative overflow-hidden">
                          {player.image && (
                            <Image
                              src={player.image}
                              alt={player.name}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-gray-500">
                            {player.team} • {ROLES[player.role as keyof typeof ROLES]}
                          </div>
                        </div>
                      </div>
                      <div className="w-1/4 text-center">{player.points}</div>
                      <div className="w-1/4 text-center">{player.credits}</div>
                      <button
                        className={`ml-2 w-8 h-8 rounded-full flex items-center justify-center ${
                          player.selected
                            ? 'bg-red-500 text-white'
                            : canSelectPlayer(player)
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        onClick={() => togglePlayerSelection(player.id)}
                        disabled={!player.selected && !canSelectPlayer(player)}
                      >
                        {player.selected ? '-' : '+'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Continue Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
              <button
                className={`w-full py-3 rounded-lg font-medium ${
                  teamStats.totalPlayers === CONSTRAINTS.TOTAL_PLAYERS
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                onClick={proceedToCaptainSelection}
                disabled={teamStats.totalPlayers !== CONSTRAINTS.TOTAL_PLAYERS}
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Captain Selection */}
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                <h2 className="text-xl font-bold mb-2">Choose Captain & Vice Captain</h2>
                <p className="text-sm text-gray-600 mb-4">
                  <FaInfoCircle className="inline mr-1" />
                  Captain gets 2x points, Vice Captain gets 1.5x points
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                  <input
                    type="text"
                    placeholder="Enter team name"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    maxLength={20}
                  />
                </div>
                
                <div className="divide-y">
                  {selectedPlayers.map((player) => (
                    <div key={player.id} className="py-3 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 relative overflow-hidden">
                          {player.image && (
                            <Image
                              src={player.image}
                              alt={player.name}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-gray-500">
                            {player.team} • {ROLES[player.role as keyof typeof ROLES]}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          className={`px-3 py-1 rounded-full text-sm flex items-center ${
                            player.isCaptain
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                          onClick={() => setCaptain(player.id)}
                        >
                          <FaCrown className="mr-1" /> C
                        </button>
                        <button
                          className={`px-3 py-1 rounded-full text-sm flex items-center ${
                            player.isViceCaptain
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                          onClick={() => setViceCaptain(player.id)}
                        >
                          <FaStar className="mr-1" /> VC
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
              <div className="flex space-x-4">
                <button
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium"
                  onClick={backToPlayerSelection}
                >
                  Back
                </button>
                <button
                  className={`flex-1 py-3 rounded-lg font-medium ${
                    isTeamValid()
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={handleSubmitTeam}
                  disabled={!isTeamValid()}
                >
                  Create Team
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
