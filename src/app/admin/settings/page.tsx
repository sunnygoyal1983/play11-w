'use client';

import { useState, useEffect } from 'react';
// @ts-ignore
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  FaCog,
  FaPlus,
  FaEdit,
  FaTrash,
  FaFilter,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaTimes,
} from 'react-icons/fa';

interface Setting {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [filteredSettings, setFilteredSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [editSettingId, setEditSettingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    key: string;
    value: string;
    type: string;
    category: string;
    description: string;
    isPublic: boolean;
  }>({
    key: '',
    value: '',
    type: 'string',
    category: 'general',
    description: '',
    isPublic: false,
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch settings data when component loads
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/settings');

      if (!response.ok) {
        const errorData = await response.json();

        // Detailed error for authentication issues
        if (response.status === 401) {
          console.error('Admin authorization error:', errorData);
          throw new Error(
            'Unauthorized: Admin access required. Please log out and log back in to refresh your session.'
          );
        }

        throw new Error(errorData.error || 'Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
      setFilteredSettings(data);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data.map((setting: Setting) => setting.category))
      ) as string[];
      setCategories(['all', ...uniqueCategories]);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch settings'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (category: string) => {
    setFilterCategory(category);
    if (category === 'all') {
      setFilteredSettings(settings);
    } else {
      setFilteredSettings(
        settings.filter((setting) => setting.category === category)
      );
    }
  };

  const handleEditClick = (setting: Setting) => {
    setEditSettingId(setting.id);
    setEditFormData({
      key: setting.key,
      value: setting.value,
      type: setting.type,
      category: setting.category,
      description: setting.description || '',
      isPublic: setting.isPublic,
    });
  };

  const handleCancelEdit = () => {
    setEditSettingId(null);
  };

  const handleEditSubmit = async (e: React.FormEvent, settingKey: string) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/settings/${settingKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update setting');
      }

      const updatedSetting = await response.json();

      // Update local state
      setSettings((prevSettings) =>
        prevSettings.map((setting) =>
          setting.key === settingKey ? updatedSetting : setting
        )
      );
      setFilteredSettings((prevSettings) =>
        prevSettings.map((setting) =>
          setting.key === settingKey ? updatedSetting : setting
        )
      );

      setEditSettingId(null);
    } catch (error) {
      console.error('Error updating setting:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update setting'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add setting');
      }

      const newSetting = await response.json();

      // Update local state
      setSettings((prevSettings) => [...prevSettings, newSetting]);

      // Update filtered settings if the category matches
      if (filterCategory === 'all' || filterCategory === newSetting.category) {
        setFilteredSettings((prevSettings) => [...prevSettings, newSetting]);
      }

      // Add new category if not exists
      if (!categories.includes(newSetting.category)) {
        setCategories((prevCategories) => [
          ...prevCategories,
          newSetting.category,
        ]);
      }

      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error('Error adding setting:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to add setting'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSetting = async (settingKey: string) => {
    if (!confirm('Are you sure you want to delete this setting?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/settings/${settingKey}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete setting');
      }

      // Update local state
      const updatedSettings = settings.filter(
        (setting) => setting.key !== settingKey
      );
      setSettings(updatedSettings);
      setFilteredSettings(
        filteredSettings.filter((setting) => setting.key !== settingKey)
      );

      // Recalculate categories
      const uniqueCategories = Array.from(
        new Set(updatedSettings.map((setting) => setting.category))
      ) as string[];
      setCategories(['all', ...uniqueCategories]);
    } catch (error) {
      console.error('Error deleting setting:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to delete setting'
      );
    }
  };

  const resetForm = () => {
    setEditFormData({
      key: '',
      value: '',
      type: 'string',
      category: 'general',
      description: '',
      isPublic: false,
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setEditFormData({
        ...editFormData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setEditFormData({
        ...editFormData,
        [name]: value,
      });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-red-700">{error}</p>
            <button
              className="mt-2 text-red-700 underline"
              onClick={() => fetchSettings()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center text-gray-800">
          <FaCog className="mr-2 text-indigo-600" /> Application Settings
        </h1>
        <button
          onClick={() => {
            setShowAddForm(true);
            resetForm();
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaPlus className="mr-2" />
          Add Setting
        </button>
      </div>

      {/* Filter by category */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex items-center">
          <FaFilter className="text-gray-400 mr-2" />
          <span className="text-gray-600 mr-4">Filter by Category:</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleFilterChange(category)}
                className={`px-3 py-1 rounded-full text-sm ${
                  filterCategory === category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
          <div className="bg-indigo-600 text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-medium">Add New Setting</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-white hover:text-gray-200"
            >
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleAddSubmit} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="key"
                  value={editFormData.key}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="value"
                  value={editFormData.value}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  name="type"
                  value={editFormData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={editFormData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  list="categories"
                />
                <datalist id="categories">
                  {categories
                    .filter((cat) => cat !== 'all')
                    .map((category) => (
                      <option key={category} value={category} />
                    ))}
                </datalist>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={editFormData.isPublic}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Public (accessible without admin rights)
                  </span>
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" /> Save Setting
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Settings Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Key
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Value
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Visibility
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSettings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No settings found
                  </td>
                </tr>
              ) : (
                filteredSettings.map((setting) => (
                  <tr key={setting.id}>
                    {editSettingId === setting.id ? (
                      <td colSpan={6} className="px-6 py-4">
                        <form
                          onSubmit={(e) => handleEditSubmit(e, setting.key)}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Key
                              </label>
                              <input
                                type="text"
                                value={editFormData.key}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Value
                              </label>
                              <input
                                type="text"
                                name="value"
                                value={editFormData.value}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type
                              </label>
                              <select
                                name="type"
                                value={editFormData.type}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                              >
                                <option value="string">String</option>
                                <option value="number">Number</option>
                                <option value="boolean">Boolean</option>
                                <option value="json">JSON</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category
                              </label>
                              <input
                                type="text"
                                name="category"
                                value={editFormData.category}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                list="categories"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                              </label>
                              <textarea
                                name="description"
                                value={editFormData.description}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                rows={2}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  name="isPublic"
                                  checked={editFormData.isPublic}
                                  onChange={handleInputChange}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                  Public (accessible without admin rights)
                                </span>
                              </label>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={submitting}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                            >
                              {submitting ? (
                                <>
                                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <FaSave className="mr-2" /> Save Changes
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {setting.key}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="max-w-xs truncate">
                            {setting.value}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {setting.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {setting.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {setting.isPublic ? (
                            <span className="inline-flex items-center text-green-600">
                              <FaEye className="mr-1" /> Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-gray-600">
                              <FaEyeSlash className="mr-1" /> Private
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditClick(setting)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteSetting(setting.key)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
