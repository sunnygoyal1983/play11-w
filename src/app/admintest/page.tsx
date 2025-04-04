'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function AdminTestPage() {
  const { data: session, status } = useSession();
  const [result, setResult] = useState<any>(null);
  const [simpleResult, setSimpleResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAdminAccess = async () => {
    setLoading(true);
    try {
      // Regular Admin Check
      const response = await fetch('/api/admin/check-admin');
      const data = await response.json();

      // Simple Admin Check
      const simpleResponse = await fetch('/api/admin/simple-check');
      const simpleData = await simpleResponse.json();

      setResult({
        success: true,
        data,
        session: session
          ? {
              id: session.user?.id,
              email: session.user?.email,
              role: session.user?.role,
            }
          : null,
      });

      setSimpleResult({
        success: true,
        data: simpleData,
      });
    } catch (error) {
      setResult({
        success: false,
        error: String(error),
        session: session
          ? {
              id: session.user?.id,
              email: session.user?.email,
              role: session.user?.role,
            }
          : null,
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-test on mount
  useEffect(() => {
    if (status === 'authenticated') {
      testAdminAccess();
    }
  }, [status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Admin Access Test
        </h1>

        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">Session Status: {status}</h2>
          {status === 'authenticated' && session?.user && (
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <p>
                <strong>User:</strong> {session.user.email}
              </p>
              <p>
                <strong>ID:</strong> {session.user.id}
              </p>
              <p>
                <strong>Role:</strong> {JSON.stringify(session.user.role)}
              </p>
            </div>
          )}

          {status === 'unauthenticated' && (
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              Not signed in. Please sign in to test admin access.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={testAdminAccess}
            disabled={loading || status !== 'authenticated'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Admin Access'}
          </button>

          {result && (
            <div
              className={`mt-4 p-4 rounded border ${
                result.success && result.data.isAdmin
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <h3 className="font-bold mb-2">
                Database Check:{' '}
                {result.success
                  ? result.data.isAdmin
                    ? 'Admin Access: Granted ✅'
                    : 'Admin Access: Denied ❌'
                  : 'Error Checking Admin Access ❌'}
              </h3>
              <pre className="text-xs bg-white p-2 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {simpleResult && (
            <div
              className={`mt-4 p-4 rounded border ${
                simpleResult.success && simpleResult.data.isAdmin
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <h3 className="font-bold mb-2">
                Simple Check:{' '}
                {simpleResult.success
                  ? simpleResult.data.isAdmin
                    ? 'Admin Access: Granted ✅'
                    : 'Admin Access: Denied ❌'
                  : 'Error Checking Admin Access ❌'}
              </h3>
              <pre className="text-xs bg-white p-2 rounded overflow-auto">
                {JSON.stringify(simpleResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="space-y-2 mt-6">
            <div className="flex space-x-2">
              <a
                href="/api/admin/check-admin"
                target="_blank"
                className="block text-center flex-1 bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded"
              >
                DB Check API
              </a>
              <a
                href="/api/admin/simple-check"
                target="_blank"
                className="block text-center flex-1 bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded"
              >
                Simple Check API
              </a>
            </div>
            <a
              href="/admin/settings"
              target="_blank"
              className="block text-center bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded"
            >
              Go to Admin Settings
            </a>
            <a
              href="/auth/signin"
              className="block text-center bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded"
            >
              Go to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
