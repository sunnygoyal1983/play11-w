# Database Migration Instructions

I've added the necessary profile fields to the Prisma schema. To apply these changes to your database, please follow these steps:

## 1. Generate migration SQL files

```bash
npx prisma migrate dev --name add_profile_fields
```

This command will:

1. Generate the SQL migration files
2. Apply the changes to your development database
3. Update the Prisma client

## 2. Apply the migration to your database

If you're using a different environment for production, you can use:

```bash
npx prisma migrate deploy
```

## 3. Update the Prisma client to reflect the schema changes

```bash
npx prisma generate
```

## Changes Summary

The following fields have been added to the User model:

- `phone`: String? - User's phone number (optional)
- `address`: String? - User's address (optional)
- `dob`: DateTime? - User's date of birth (optional)
- `panNumber`: String? - User's PAN card number (optional)
- `kycVerified`: Boolean - Whether the user's KYC is verified (defaults to false)

## Updating the API

After migrating, the User profile API (`/api/user/profile`) will automatically use these new fields. You won't need to add mock data in the API response anymore since these fields are now part of the database schema.

The profile page UI already supports these fields and will display/edit them properly.

## KYC Verification

A new field `kycVerified` has been added to track whether a user has completed their KYC verification. When a user submits their PAN number, you can add a verification process and update this flag when verified.
