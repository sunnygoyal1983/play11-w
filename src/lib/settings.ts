import { prisma } from '@/lib/prisma';
import { cache } from 'react';
import { Setting as PrismaSetting } from '@prisma/client';

/**
 * Interface for a setting object - matches the Prisma Setting model
 */
export type Setting = PrismaSetting;

/**
 * Converts a setting value to its appropriate type based on the type field
 */
export function parseSettingValue(setting: Setting): any {
  switch (setting.type) {
    case 'number':
      return parseFloat(setting.value);
    case 'boolean':
      return setting.value.toLowerCase() === 'true';
    case 'json':
      try {
        return JSON.parse(setting.value);
      } catch (e) {
        console.error(`Error parsing JSON setting ${setting.key}:`, e);
        return null;
      }
    case 'string':
    default:
      return setting.value;
  }
}

/**
 * Get all settings (cached)
 */
export const getAllSettings = cache(async (): Promise<Setting[]> => {
  return await prisma.setting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });
});

/**
 * Get public settings (cached)
 */
export const getPublicSettings = cache(async (): Promise<Setting[]> => {
  return await prisma.setting.findMany({
    where: { isPublic: true },
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });
});

/**
 * Get settings by category (cached)
 */
export const getSettingsByCategory = cache(
  async (category: string): Promise<Setting[]> => {
    return await prisma.setting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });
  }
);

/**
 * Get a single setting by key (cached)
 */
export const getSetting = cache(
  async (key: string): Promise<Setting | null> => {
    return await prisma.setting.findUnique({
      where: { key },
    });
  }
);

/**
 * Get a setting value by key (cached)
 * Returns the parsed value based on the setting type
 */
export const getSettingValue = cache(
  async (key: string, defaultValue?: any): Promise<any> => {
    const setting = await getSetting(key);

    if (!setting) {
      return defaultValue;
    }

    return parseSettingValue(setting);
  }
);

/**
 * Update a setting
 */
export async function updateSetting(key: string, value: any): Promise<Setting> {
  // Convert value to string if needed
  let stringValue: string;

  if (typeof value === 'object') {
    stringValue = JSON.stringify(value);
  } else {
    stringValue = String(value);
  }

  return await prisma.setting.update({
    where: { key },
    data: {
      value: stringValue,
      updatedAt: new Date(),
    },
  });
}

/**
 * Create a new setting
 */
export async function createSetting(data: {
  key: string;
  value: string;
  type?: string;
  category?: string;
  description?: string;
  isPublic?: boolean;
}): Promise<Setting> {
  return await prisma.setting.create({
    data: {
      key: data.key,
      value: data.value,
      type: data.type || 'string',
      category: data.category || 'general',
      description: data.description || null,
      isPublic: data.isPublic || false,
    },
  });
}

/**
 * Delete a setting
 */
export async function deleteSetting(key: string): Promise<void> {
  await prisma.setting.delete({
    where: { key },
  });
}
