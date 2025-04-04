# Settings Model Migration Guide

This migration adds a `Setting` model to store application-wide settings in a flexible key-value format.

## How to Apply This Migration

1. First, make sure your Prisma schema has been updated to include the Setting model.

2. Run the migration:
   ```bash
   npx prisma migrate dev --name add_settings_model
   ```

## Model Details

The `Setting` model includes:

- `id`: Unique identifier
- `key`: Unique setting key (e.g., 'site_name')
- `value`: The setting value as a string
- `type`: Data type ('string', 'number', 'boolean', 'json')
- `category`: For grouping settings (e.g., 'general', 'payment')
- `description`: Optional description of the setting
- `isPublic`: Whether the setting is publicly accessible
- `createdAt` and `updatedAt`: Timestamps

## Default Settings

The migration creates the following default settings:

1. **Site Name**: General site name
2. **Maintenance Mode**: Toggle for site maintenance
3. **Min Deposit Amount**: Minimum allowed deposit
4. **Max Withdrawal Amount**: Maximum allowed withdrawal
5. **Contact Email**: Support email address
6. **KYC Required**: Whether KYC verification is required

## Accessing Settings

Settings can be accessed via the Prisma client:

```typescript
// Get all settings
const settings = await prisma.setting.findMany();

// Get a specific setting
const siteName = await prisma.setting.findUnique({
  where: { key: 'site_name' },
});

// Get all settings in a category
const paymentSettings = await prisma.setting.findMany({
  where: { category: 'payment' },
});

// Get only public settings
const publicSettings = await prisma.setting.findMany({
  where: { isPublic: true },
});
```
