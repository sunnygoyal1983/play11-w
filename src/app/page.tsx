"use client";

import Link from 'next/link';
import Image from 'next/image';
import { FaTrophy, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import MainLayout from '@/components/MainLayout';

export default function Home() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg mb-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Play Fantasy Cricket, Win Real Cash!
              </h1>
              <p className="text-xl mb-6">
                Create your dream team, join contests, and compete with players around the world.
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <Link
                  href="/auth/signup"
                  className="bg-white text-indigo-700 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold text-center"
                >
                  Register Now
                </Link>
                <Link
                  href="/matches"
                  className="bg-indigo-800 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold text-center"
                >
                  View Matches
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-80 h-80">
                <Image
                  src="/cricket-hero.png"
                  alt="Fantasy Cricket"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 mb-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How Play11 Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-indigo-100 p-4 rounded-full">
                  <FaUsers className="text-indigo-600 text-3xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Your Team</h3>
              <p className="text-gray-600">
                Select 11 players within a 100 credit budget. Choose a captain and vice-captain.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-indigo-100 p-4 rounded-full">
                  <FaTrophy className="text-indigo-600 text-3xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Join Contests</h3>
              <p className="text-gray-600">
                Enter your team in contests with different entry fees and prize pools.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-indigo-100 p-4 rounded-full">
                  <FaMoneyBillWave className="text-indigo-600 text-3xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Win Cash Prizes</h3>
              <p className="text-gray-600">
                Score points based on your players' performance and win real cash prizes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Matches Preview */}
      <section className="py-12 bg-gray-100 rounded-lg mb-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Upcoming Matches</h2>
            <Link href="/matches" className="text-indigo-600 hover:text-indigo-800 font-medium">
              View All
            </Link>
          </div>
          
          {/* Placeholder for upcoming matches - would be populated from API */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((match) => (
              <div key={match} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-indigo-50 p-3 border-b">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">T20 • Starts in 2h</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      ₹2 Lakhs Prize
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                      <span className="font-medium">Team A</span>
                    </div>
                    <span className="text-sm font-bold">VS</span>
                    <div className="flex items-center">
                      <span className="font-medium">Team B</span>
                      <div className="w-10 h-10 bg-gray-200 rounded-full ml-3"></div>
                    </div>
                  </div>
                  <Link
                    href={`/matches/${match}`}
                    className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 rounded"
                  >
                    Create Team
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: 'Rahul Sharma',
                quote: 'I won ₹50,000 in my first month using Play11! The platform is easy to use and has great contests.',
              },
              {
                name: 'Priya Patel',
                quote: 'Play11 has the best user interface among all fantasy platforms. I love creating multiple teams for big matches.',
              },
              {
                name: 'Amit Kumar',
                quote: 'Instant withdrawals and excellent customer support. Play11 is my go-to fantasy cricket platform now.',
              },
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full mr-4"></div>
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 italic">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
