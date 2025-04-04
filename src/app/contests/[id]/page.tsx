'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams, notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import {
  FaTrophy,
  FaUsers,
  FaClock,
  FaExclamationCircle,
  FaChevronRight,
} from 'react-icons/fa';
import ContestDetails from '@/components/contests/ContestDetails';
import PrizeBreakupTable from '@/components/contests/PrizeBreakupTable';
import { getContest, getPrizeBreakup } from '@/lib/api-helpers';

interface ContestPageProps {
  params: {
    id: string;
  };
  searchParams: {
    matchId?: string;
  };
}

export default async function ContestPage({
  params,
  searchParams,
}: ContestPageProps) {
  const { id } = params;
  const { matchId } = searchParams;

  try {
    // Fetch contest details
    const contest = await getContest(id);

    if (!contest) {
      return notFound();
    }

    // Fetch prize breakup
    const prizeBreakup = await getPrizeBreakup(id);

    return (
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading contest details...</div>}>
          <div className="mb-6">
            <Link
              href={`/matches/${matchId || contest.matchId}`}
              className="text-indigo-600 hover:text-indigo-800"
            >
              ← Back to Match
            </Link>
          </div>

          <ContestDetails contest={contest} />

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Prize Breakup</h2>
            <PrizeBreakupTable prizeBreakup={prizeBreakup} />
          </div>

          <div className="mt-8">
            <Link
              href={`/contests/${id}/join?matchId=${
                matchId || contest.matchId
              }`}
              className="inline-block w-full py-3 px-6 rounded-lg bg-indigo-600 text-white font-medium text-center shadow-md hover:bg-indigo-700 transition duration-200"
            >
              Join Contest
            </Link>
          </div>
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error('Error loading contest:', error);
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mt-4">
        <p>Failed to load contest. Please try again later.</p>
        <Link href="/" className="underline">
          Go to Home
        </Link>
      </div>
    );
  }
}
