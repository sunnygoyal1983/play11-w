import React from 'react';

interface CommentaryCardProps {
  commentary: string[];
}

const CommentaryCard: React.FC<CommentaryCardProps> = ({ commentary }) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-md my-4">
      <h2 className="text-xl font-bold border-b pb-2 mb-4">Commentary</h2>

      {commentary && commentary.length > 0 ? (
        <ul className="space-y-3">
          {commentary.map((comment, index) => (
            <li
              key={index}
              className="pb-2 border-b border-gray-100 last:border-0"
            >
              {comment}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 italic">No commentary available</p>
      )}
    </div>
  );
};

export default CommentaryCard;
