"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FaSave, FaArrowLeft } from 'react-icons/fa';

export default function NewMatchTeam() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    teamId: `team_${Date.now()}` // Generate a unique ID for the new team
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/match-teams', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: formData.teamId,
          name: formData.name,
          logo: formData.logo
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create team');
      }

      router.push('/admin/match-teams');
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Failed to create team. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link 
            href="/admin/match-teams" 
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <FaArrowLeft />
          </Link>
          <h1 className="text-2xl font-bold">Add New Team</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Team Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="logo">
              Team Logo URL
            </label>
            <input
              id="logo"
              name="logo"
              type="text"
              value={formData.logo}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {formData.logo && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">Preview:</p>
                <Image 
                  src={formData.logo} 
                  alt="Logo Preview" 
                  width={50} 
                  height={50}
                  className="rounded-full"
                  onError={() => {
                    setFormData(prev => ({
                      ...prev,
                      logo: ''
                    }));
                    alert('Invalid image URL. Please provide a valid image URL.');
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Link
              href="/admin/match-teams"
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  Create Team
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
