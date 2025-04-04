'use client';

import { ReactNode } from 'react';
import Navbar from './Navbar';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6">{children}</main>
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold">Play11</h3>
              <p className="text-gray-400">Fantasy Cricket Platform</p>
            </div>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6">
              <a href="#" className="hover:text-indigo-400">
                Terms of Service
              </a>
              <a href="#" className="hover:text-indigo-400">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-indigo-400">
                Contact Us
              </a>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-400 text-sm">
            {new Date().getFullYear()} Play11. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
