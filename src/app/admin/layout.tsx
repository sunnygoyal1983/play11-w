'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  FaUsers,
  FaTrophy,
  FaMoneyBillWave,
  FaCog,
  FaChartLine,
  FaBars,
  FaTimes,
  FaBroom,
} from 'react-icons/fa';
import { MdSportsCricket } from 'react-icons/md';
import AdminProtected from '@/components/AdminProtected';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminProtected>
      <div className="flex min-h-screen bg-gray-100">
        {/* Mobile sidebar toggle */}
        <div className="md:hidden fixed top-0 left-0 z-50 p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-indigo-600 focus:outline-none"
          >
            {sidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-indigo-800 text-white transition-transform transform md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:relative md:translate-x-0`}
        >
          <div className="p-6 text-xl font-bold border-b border-indigo-700">
            Play11 Admin
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin/dashboard"
                  className="flex items-center p-3 rounded-md hover:bg-indigo-700 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <FaChartLine className="mr-3" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className="flex items-center p-3 rounded-md hover:bg-indigo-700 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <FaUsers className="mr-3" />
                  Users
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/matches"
                  className="flex items-center p-3 rounded-md hover:bg-indigo-700 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <MdSportsCricket className="mr-3" />
                  Matches
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/contests"
                  className="flex items-center p-3 rounded-md hover:bg-indigo-700 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <FaTrophy className="mr-3" />
                  Contests
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/transactions"
                  className="flex items-center p-3 rounded-md hover:bg-indigo-700 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <FaMoneyBillWave className="mr-3" />
                  Transactions
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/cleanup-transactions"
                  className="flex items-center p-3 rounded-md hover:bg-indigo-700 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <FaBroom className="mr-3" />
                  Clean Transactions
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className="flex items-center p-3 rounded-md hover:bg-indigo-700 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <FaCog className="mr-3" />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 p-8">{children}</div>
      </div>
    </AdminProtected>
  );
}
