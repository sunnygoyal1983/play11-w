"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  FaTachometerAlt, 
  FaUsers, 
  FaTrophy, 
  FaFutbol, 
  FaUserFriends,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaShieldAlt
} from 'react-icons/fa';
import { MdSportsCricket } from 'react-icons/md';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Admin navigation items
  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: FaTachometerAlt },
    { name: 'Matches', href: '/admin/matches', icon: MdSportsCricket },
    { name: 'Match Teams', href: '/admin/match-teams', icon: FaShieldAlt },
    { name: 'Contests', href: '/admin/contests', icon: FaTrophy },
    { name: 'Users', href: '/admin/users', icon: FaUsers },
    { name: 'Fantasy Teams', href: '/admin/teams', icon: FaUserFriends },
    { name: 'Players', href: '/admin/players', icon: FaFutbol },
  ];

  useEffect(() => {
    // Check if user is authenticated and is an admin
    if (status === 'loading') return;
    
    // For now, we'll consider all authenticated users as admins
    // In a real app, you would check a specific admin flag or role
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin');
    } else {
      setLoading(false);
    }
  }, [status, router]);

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  // If still loading, show a loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If authenticated and loading is complete, show the admin layout
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-800 text-white transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-indigo-700">
          <Link href="/admin" className="flex items-center space-x-2 text-xl font-bold">
            <MdSportsCricket size={24} />
            <span>Play11 Admin</span>
          </Link>
          <button 
            className="md:hidden text-white focus:outline-none" 
            onClick={() => setSidebarOpen(false)}
          >
            <FaTimes size={20} />
          </button>
        </div>
        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                  isActive(item.href)
                    ? 'bg-indigo-900 text-white'
                    : 'text-indigo-100 hover:bg-indigo-700'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
        <div className="absolute bottom-0 w-full border-t border-indigo-700 p-4">
          <Link
            href="/"
            className="flex items-center px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-700 rounded-md"
          >
            <MdSportsCricket className="mr-3 h-5 w-5" />
            View Site
          </Link>
          <button
            onClick={() => {/* signOut() */}}
            className="flex items-center w-full px-4 py-2 mt-1 text-sm font-medium text-indigo-100 hover:bg-indigo-700 rounded-md"
          >
            <FaSignOutAlt className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Top navbar */}
        <div className="sticky top-0 z-10 bg-white md:hidden flex items-center h-16 px-4 border-b border-gray-200">
          <button
            className="text-gray-500 focus:outline-none"
            onClick={() => setSidebarOpen(true)}
          >
            <FaBars size={20} />
          </button>
          <div className="ml-4 font-semibold">Play11 Admin</div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}
