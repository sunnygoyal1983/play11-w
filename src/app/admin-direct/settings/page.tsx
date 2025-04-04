'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FaCog } from 'react-icons/fa';

export default function DirectSettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // Debug information
    setDebugInfo({
      status,
      session: session
        ? {
            email: session.user?.email,
            id: session.user?.id,
            role: session.user?.role,
          }
        : null,
    });

    if (status !== 'loading') {
      fetchSettings();
    }
  }, [status, session]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      // First check admin status
      const adminCheckResponse = await fetch('/api/admin/check-admin');
      const adminCheckData = await adminCheckResponse.json();

      setDebugInfo((prev) => ({
        ...prev,
        adminCheck: adminCheckData,
      }));

      // Then fetch settings
      const response = await fetch('/api/admin/settings');
      const fullResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()]),
      };

      setApiResponse(fullResponse);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch settings'
      );
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h1 className="text-xl font-bold text-white flex items-center">
            <FaCog className="mr-2" />
            Direct Admin Settings Access (Debug)
          </h1>
        </div>

        <div className="p-6">
          <Link
            href="/admin/settings"
            className="mb-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Go to regular Admin Settings
          </Link>

          <div className="mt-6 space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">
                Session Information
              </h2>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>

            {apiResponse && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">API Response</h2>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}

            {error ? (
              <div className="bg-red-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-2 text-red-700">
                  Error
                </h2>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={fetchSettings}
                  className="mt-2 text-red-700 underline"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Settings Data</h2>
                {settings.length === 0 ? (
                  <p className="text-gray-500">No settings found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Key
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Value
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Type
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Category
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {settings.map((setting: any) => (
                          <tr key={setting.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {setting.key}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {setting.value}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {setting.type}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {setting.category}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
