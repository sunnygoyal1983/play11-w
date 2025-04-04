'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { isAdminUser } from '@/lib/auth-utils';

export default function AdminProtected({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Debug information
    setDebugInfo({
      status,
      email: session?.user?.email,
      role: session?.user?.role,
      id: session?.user?.id,
    });

    console.log('AdminProtected - Session status:', status);
    console.log('AdminProtected - Session data:', session);

    if (status === 'loading') return;

    // If not logged in, redirect to login
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // Check if user is admin based on role or email
    const isAdmin =
      session?.user?.role === UserRole.ADMIN ||
      (session?.user?.email && isAdminUser(session.user.email));

    console.log('AdminProtected - Direct check isAdmin:', isAdmin);
    console.log('AdminProtected - User role:', session?.user?.role);
    console.log(
      'AdminProtected - Admin emails check:',
      session?.user?.email && isAdminUser(session.user.email)
    );

    if (isAdmin) {
      setIsAuthorized(true);
      setLoading(false);
    } else {
      // Try server-side admin check for older sessions without role
      fetch('/api/admin/check-admin')
        .then((res) => res.json())
        .then((data) => {
          console.log('AdminProtected - API check result:', data);
          if (data.isAdmin) {
            setIsAuthorized(true);
          } else {
            console.error('Not authorized as admin');
            router.push('/auth/signin?error=AdminRequired');
          }
        })
        .catch((err) => {
          console.error('Admin check failed:', err);
          router.push('/auth/signin?error=AdminCheckFailed');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [status, session, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="text-xs bg-gray-100 p-2 rounded max-w-md overflow-auto">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }

  if (!isAuthorized && status !== 'loading') {
    return null; // Hide content while redirecting
  }

  return <>{children}</>;
}
