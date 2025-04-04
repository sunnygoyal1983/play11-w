/**
 * Fallback settings data for use when the database table doesn't exist yet
 * This ensures the admin UI still works even if migrations haven't been applied
 */

interface FallbackSetting {
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

// Default settings that the app would have
export const fallbackSettings: FallbackSetting[] = [
  {
    id: '1',
    key: 'site_name',
    value: 'Play11',
    type: 'string',
    category: 'general',
    description: 'The name of the site',
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    key: 'maintenance_mode',
    value: 'false',
    type: 'boolean',
    category: 'system',
    description: 'Whether the site is in maintenance mode',
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    key: 'min_deposit_amount',
    value: '100',
    type: 'number',
    category: 'payment',
    description: 'Minimum deposit amount',
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    key: 'max_withdrawal_amount',
    value: '10000',
    type: 'number',
    category: 'payment',
    description: 'Maximum withdrawal amount',
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    key: 'contact_email',
    value: 'support@play11.com',
    type: 'string',
    category: 'contact',
    description: 'Contact email for support',
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    key: 'kyc_required',
    value: 'true',
    type: 'boolean',
    category: 'verification',
    description: 'Whether KYC verification is required',
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
