'use client';

import { useState, useEffect } from 'react';

export default function UpdateClientPage() {
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState<string>('');
  const [schemaDetails, setSchemaDetails] = useState<any>(null);

  // Function to fix the schema
  const fixSchema = async () => {
    try {
      setStatus('loading');
      setMessage('Checking database schema...');

      const response = await fetch('/api/fix-schema');
      const data = await response.json();

      setSchemaDetails(data);

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to update schema');
      }
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    }
  };

  // Run check on page load
  useEffect(() => {
    fixSchema();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Database Schema Update</h1>

      <div className="mb-6">
        <div
          className={`p-4 rounded mb-4 ${
            status === 'idle'
              ? 'bg-gray-100'
              : status === 'loading'
              ? 'bg-blue-100'
              : status === 'success'
              ? 'bg-green-100'
              : 'bg-red-100'
          }`}
        >
          <p className="font-semibold">
            {status === 'idle'
              ? 'Ready to update schema'
              : status === 'loading'
              ? 'Updating schema...'
              : status === 'success'
              ? 'Schema update successful'
              : 'Schema update failed'}
          </p>
          <p className="mt-2">{message}</p>
        </div>

        <button
          onClick={fixSchema}
          disabled={status === 'loading'}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {status === 'loading' ? 'Working...' : 'Run Update Again'}
        </button>
      </div>

      {schemaDetails && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Schema Details</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(schemaDetails, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 border-t pt-4">
        <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
        <ol className="list-decimal pl-5 space-y-3">
          <li>
            Restart your Next.js server to refresh the Prisma client
            <div className="text-xs bg-gray-100 p-2 mt-1 rounded">
              <code>npm run dev</code>
            </div>
          </li>
          <li>
            If you're still having issues, try regenerating your Prisma client
            manually:
            <div className="text-xs bg-gray-100 p-2 mt-1 rounded">
              <code>npx prisma generate</code>
            </div>
          </li>
          <li>
            Test the import API with tournament ID 3 (T20 International):
            <div className="text-xs bg-gray-100 p-2 mt-1 rounded">
              <code>
                <a
                  href="/api/import?action=import&entityType=tournaments&tournamentId=3"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  /api/import?action=import&entityType=tournaments&tournamentId=3
                </a>
              </code>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
