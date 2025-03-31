"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { FaTrophy, FaUser, FaWallet } from 'react-icons/fa';
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
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold">
            <MdSportsCricket size={24} />
            <span>Play11</span>
          </Link>
          
          <div className="hidden md:flex space-x-6">
            <Link href="/matches" className={`hover:text-indigo-200 ${isActive('/matches')}`}>
              Matches
            </Link>
            <Link href="/contests" className={`hover:text-indigo-200 ${isActive('/contests')}`}>
              Contests
            </Link>
            <Link href="/teams" className={`hover:text-indigo-200 ${isActive('/teams')}`}>
              My Teams
            </Link>
          </div>
          
          {session ? (
            <div className="flex items-center space-x-4">
              <Link href="/wallet" className="flex items-center space-x-1 hover:text-indigo-200">
                <FaWallet />
                <span>Wallet</span>
              </Link>
              <Link href="/profile" className="flex items-center space-x-1 hover:text-indigo-200">
                <FaUser />
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
          <Link href="/contests" className="flex flex-col items-center text-xs">
            <FaTrophy size={20} />
            <span>Contests</span>
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
