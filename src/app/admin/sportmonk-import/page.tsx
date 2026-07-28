'use client';

import Link from 'next/link';

export default function SportmonkImportPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">SportMonk Import</h1>
      <p className="text-gray-600 mb-4">
        Use the SportMonk admin tools to import tournaments, matches, and
        players.
      </p>
      <Link
        href="/admin/sportmonk"
        className="text-indigo-600 hover:text-indigo-800 underline"
      >
        Go to SportMonk admin
      </Link>
    </div>
  );
}
