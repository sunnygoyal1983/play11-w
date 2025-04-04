'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  imageUrl?: string;
  actionLabel?: string;
  actionUrl?: string;
}

export default function EmptyState({
  title,
  description,
  imageUrl = '/empty-state.svg',
  actionLabel,
  actionUrl,
}: EmptyStateProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md p-8 text-center">
      <div className="mb-4">
        {!imageError ? (
          <Image
            src={imageUrl}
            alt={title}
            width={200}
            height={200}
            className="mx-auto"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-48 h-48 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-24 w-24 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
        )}
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      {actionLabel && actionUrl && (
        <Link
          href={actionUrl}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded inline-block"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
