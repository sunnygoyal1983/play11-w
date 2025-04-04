# Admin and Settings Management Scripts

This directory contains utility scripts for managing admin users and application settings.

## Admin User Scripts

### Update Admin Roles

Updates existing users with admin emails to have the ADMIN role:

```bash
# Run from project root
npx ts-node scripts/update-admin-users.ts
```

This script will:

1. Find users with admin emails (admin@play11.com, admin@example.com)
2. Set their role to ADMIN
3. Display a list of all admin users in the system

### Create Default Admin User

Creates a default admin user if one doesn't exist:

```bash
# Run from project root
npx ts-node scripts/create-admin-user.ts
```

This script will:

1. Check if an admin user (admin@play11.com) exists
2. If not, create a new admin user with default credentials
3. If the user exists but doesn't have admin role, update them to ADMIN role
4. Display a list of all admin users in the system

**Note:** The default admin credentials are:

- Email: admin@play11.com
- Password: admin123

For production environments, you should modify this script to use more secure credentials.

## Troubleshooting Admin Access

If you're experiencing "Unauthorized: Admin access required" errors despite being logged in:

1. Run the update admin roles script:

   ```bash
   npx ts-node scripts/update-admin-users.ts
   ```

2. If that doesn't work, create/ensure an admin user exists:

   ```bash
   npx ts-node scripts/create-admin-user.ts
   ```

3. Log out and log back in with the admin credentials

## Understanding Admin Authorization

Admin status is determined by:

1. The user's role field in the database (set to ADMIN)
2. As a fallback, the user's email matching a predefined list of admin emails

This dual-checking system ensures that both new role-based admin users and legacy email-based admin users continue to work.
