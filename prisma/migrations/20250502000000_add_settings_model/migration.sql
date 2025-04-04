-- CreateTable
CREATE TABLE "Setting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'string',
  "category" TEXT NOT NULL DEFAULT 'general',
  "description" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- Insert default settings
INSERT INTO "Setting" ("id", "key", "value", "type", "category", "description", "isPublic", "updatedAt")
VALUES 
  (gen_random_uuid(), 'site_name', 'Play11', 'string', 'general', 'The name of the site', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'maintenance_mode', 'false', 'boolean', 'system', 'Whether the site is in maintenance mode', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'min_deposit_amount', '100', 'number', 'payment', 'Minimum deposit amount', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'max_withdrawal_amount', '10000', 'number', 'payment', 'Maximum withdrawal amount', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'contact_email', 'support@play11.com', 'string', 'contact', 'Contact email for support', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'kyc_required', 'true', 'boolean', 'verification', 'Whether KYC verification is required', true, CURRENT_TIMESTAMP); 