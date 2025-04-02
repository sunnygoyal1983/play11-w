'use client';

import { useState, useEffect } from 'react';

export default function TestAPIPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testApiConnection = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/test');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Test on page load
  useEffect(() => {
    testApiConnection();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">SportMonk API Connection Test</h1>

      <div className="mb-4">
        <button
          onClick={testApiConnection}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Test API Connection'}
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-300 rounded">
          <h2 className="font-bold text-red-800">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">
            {result.success
              ? '✅ Connection Successful'
              : '❌ Connection Failed'}
          </h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">API Information</h2>
        <table className="min-w-full border">
          <tbody>
            <tr className="border-b">
              <td className="px-4 py-2 font-semibold border-r">Base URL</td>
              <td className="px-4 py-2">
                {process.env.SPORTMONK_API_URL || 'Not configured'}
              </td>
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 font-semibold border-r">
                API Key Status
              </td>
              <td className="px-4 py-2">
                {process.env.SPORTMONK_API_KEY
                  ? '✓ Configured (Client)'
                  : '✗ Not Configured (Client)'}
                <br />
                Check server logs for actual key status
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-semibold border-r">
                Test Endpoint
              </td>
              <td className="px-4 py-2">/api/test</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
        <ul className="list-disc pl-6">
          <li className="mb-2">
            Verify your .env contains the correct SPORTMONK_API_KEY
          </li>
          <li className="mb-2">
            Ensure SPORTMONK_API_URL is set to
            &quot;https://cricket.sportmonk.com/api/v2.0&quot;
          </li>
          <li className="mb-2">
            Restart your Next.js server after making changes to environment
            variables
          </li>
          <li className="mb-2">
            Check server logs for detailed error information
          </li>
        </ul>
      </div>

      <div className="mt-6">
        <a
          href="/test-import"
          className="bg-green-500 text-white px-4 py-2 rounded inline-block"
        >
          Go to Import Test Page
        </a>
      </div>
    </div>
  );
}
