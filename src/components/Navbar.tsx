'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { FaTrophy, FaUser, FaWallet, FaListAlt } from 'react-icons/fa';
import { MdSportsCricket } from 'react-icons/md';

const Navbar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (path: string) => {
    return pathname === path ? 'bg-indigo-800' : '';
  };

  return (
    <nav className="bg-indigo-700 text-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link
            href="/"
            className="flex items-center space-x-2 text-xl font-bold"
          >
            <MdSportsCricket size={24} />
            <span>Play11</span>
          </Link>

          <div className="hidden md:flex space-x-6">
            <Link
              href="/matches"
              className={`hover:text-indigo-200 ${isActive('/matches')}`}
            >
              Matches
            </Link>
            <Link
              href="/my-contests"
              className={`hover:text-indigo-200 ${isActive('/my-contests')}`}
            >
              My Contests
            </Link>
            <Link
              href="/teams"
              className={`hover:text-indigo-200 ${isActive('/teams')}`}
            >
              My Teams
            </Link>
          </div>

          {session ? (
            <div className="flex items-center space-x-4">
              <Link
                href="/wallet"
                className="flex items-center space-x-1 hover:text-indigo-200"
              >
                <FaWallet />
                <span>Wallet</span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center space-x-1 hover:text-indigo-200"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden relative mr-1">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user?.name || 'Profile'}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML =
                            '<div class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-600 rounded-full"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z"></path></svg></div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-600 rounded-full">
                      <FaUser size={16} />
                    </div>
                  )}
                </div>
                <span>{session.user?.name}</span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Link
                href="/auth/signin"
                className="bg-white text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded font-medium"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded font-medium"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-indigo-600">
        <div className="flex justify-around py-2">
          <Link href="/matches" className="flex flex-col items-center text-xs">
            <MdSportsCricket size={20} />
            <span>Matches</span>
          </Link>
          <Link
            href="/my-contests"
            className="flex flex-col items-center text-xs"
          >
            <FaListAlt size={20} />
            <span>My Contests</span>
          </Link>
          <Link href="/teams" className="flex flex-col items-center text-xs">
            <FaUser size={20} />
            <span>Teams</span>
          </Link>
          <Link href="/wallet" className="flex flex-col items-center text-xs">
            <FaWallet size={20} />
            <span>Wallet</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
