# User Role Migration Guide

This migration adds a `role` field to the `User` model to properly handle admin permissions.

## How to Apply This Migration

1. First, make sure your Prisma schema has been updated to include the UserRole enum and the role field on the User model.

2. Run the migration:

   ```bash
   npx prisma migrate dev --name add_user_role
   ```

3. After applying the migration, you may want to run the admin role update script to ensure that existing admin users have the correct role:
   ```bash
   npx ts-node scripts/update-admin-roles.ts
   ```

## Manual Alternative

If you prefer to apply this migration manually, you can run the following SQL commands:

```sql
-- Create UserRole enum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Update existing admin users
UPDATE "User" SET "role" = 'ADMIN' WHERE "email" IN ('admin@play11.com', 'admin@example.com');
```

## Verifying the Migration

After applying the migration, you can verify that it was successful by checking the User table schema and confirming that admin users have the ADMIN role:

```sql
-- Check table schema
\d "User"

-- Check admin users
SELECT "id", "name", "email", "role" FROM "User" WHERE "role" = 'ADMIN';
```
