import React from 'react';

export interface ContestTemplate {
  id: string;
  name: string;
  description: string;
  entryFee: number;
  totalSpots: number;
  winnerPercentage: number;
  isGuaranteed: boolean;
  prizeStructure: 'topHeavy' | 'balanced' | 'distributed' | 'winnerTakesAll';
  maxWinners: number;
}

// Standard predefined templates that follow best practices
export const CONTEST_TEMPLATES: ContestTemplate[] = [
  {
    id: 'mega',
    name: 'Mega Contest',
    description: 'Large prize pool with balanced distribution',
    entryFee: 299,
    totalSpots: 10000,
    winnerPercentage: 40,
    isGuaranteed: true,
    prizeStructure: 'balanced',
    maxWinners: 50000,
  },
  {
    id: 'head-to-head',
    name: 'Head to Head',
    description: 'Two players compete directly',
    entryFee: 100,
    totalSpots: 2,
    winnerPercentage: 50,
    isGuaranteed: false,
    prizeStructure: 'winnerTakesAll',
    maxWinners: 1,
  },
  {
    id: 'winner-takes-all',
    name: 'Winner Takes All',
    description: 'One winner gets the entire prize pool',
    entryFee: 999,
    totalSpots: 500,
    winnerPercentage: 0.2,
    isGuaranteed: false,
    prizeStructure: 'winnerTakesAll',
    maxWinners: 1,
  },
  {
    id: 'small-league',
    name: 'Small League',
    description: 'Low entry fee with good winning chances',
    entryFee: 20,
    totalSpots: 100,
    winnerPercentage: 30,
    isGuaranteed: true,
    prizeStructure: 'distributed',
    maxWinners: 100,
  },
  {
    id: 'practice',
    name: 'Practice Contest',
    description: 'Free entry to practice your skills',
    entryFee: 0,
    totalSpots: 5000,
    winnerPercentage: 0,
    isGuaranteed: true,
    prizeStructure: 'distributed',
    maxWinners: 0,
  },
];

interface ContestTemplatesProps {
  onSelectTemplate: (template: ContestTemplate) => void;
}

const ContestTemplates: React.FC<ContestTemplatesProps> = ({
  onSelectTemplate,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Contest Templates</h2>
      <p className="text-gray-600">
        Select a predefined template to quickly create a contest with
        recommended settings.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONTEST_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className="border rounded-lg p-4 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
            onClick={() => onSelectTemplate(template)}
          >
            <h3 className="font-semibold text-lg">{template.name}</h3>
            <p className="text-gray-600 text-sm mb-3">{template.description}</p>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Entry Fee:</span>
                <span className="ml-1 font-medium">₹{template.entryFee}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Spots:</span>
                <span className="ml-1 font-medium">
                  {template.totalSpots.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Winners:</span>
                <span className="ml-1 font-medium">
                  {template.winnerPercentage}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">Type:</span>
                <span className="ml-1 font-medium">
                  {template.isGuaranteed ? 'Guaranteed' : 'Non-Guaranteed'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContestTemplates;
