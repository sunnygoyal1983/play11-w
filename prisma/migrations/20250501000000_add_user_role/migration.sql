-- Create UserRole enum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Update existing admin users
UPDATE "User" SET "role" = 'ADMIN' WHERE "email" IN ('admin@play11.com', 'admin@example.com'); 