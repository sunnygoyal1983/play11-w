import React from 'react';

const MatchLoadingState: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="bg-white p-6 rounded-md shadow-md animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>

        <div className="flex justify-between items-center mt-2 mb-6">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/6"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="bg-gray-100 p-4 rounded-md h-40"></div>
          <div className="bg-gray-100 p-4 rounded-md h-40"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="bg-gray-100 p-4 rounded-md h-60"></div>
          <div className="bg-gray-100 p-4 rounded-md h-60"></div>
        </div>

        <div className="bg-gray-100 p-4 rounded-md h-40 mt-4"></div>
      </div>
    </div>
  );
};

export default MatchLoadingState;
