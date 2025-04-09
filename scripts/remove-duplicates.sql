-- SQL script to identify and remove duplicate contest_win transactions
-- Run this script in your database management tool

-- Step 1: Create a temporary table to identify duplicates
CREATE TEMPORARY TABLE IF NOT EXISTS duplicate_transactions AS
WITH transaction_with_metadata AS (
  SELECT 
    id,
    "userId",
    amount,
    metadata->>'entryId' as entry_id
  FROM "Transaction"
  WHERE 
    type = 'contest_win' 
    AND metadata->>'entryId' IS NOT NULL
),
transaction_with_rank AS (
  SELECT 
    id,
    "userId",
    amount,
    entry_id,
    ROW_NUMBER() OVER (PARTITION BY entry_id ORDER BY id ASC) as rn
  FROM transaction_with_metadata
)
SELECT 
  id,
  "userId",
  amount,
  entry_id
FROM transaction_with_rank
WHERE rn > 1;

-- Step 2: Select duplicates to verify before deleting
SELECT * FROM duplicate_transactions;

-- Step 3: Update user wallet balances to reverse duplicate transactions
-- IMPORTANT: Review Step 2 results before executing this query
UPDATE "User" u
SET "walletBalance" = "walletBalance" - dt.amount
FROM duplicate_transactions dt
WHERE u.id = dt."userId";

-- Step 4: Delete duplicate transactions
-- IMPORTANT: Review Step 2 results before executing this query
DELETE FROM "Transaction"
WHERE id IN (SELECT id FROM duplicate_transactions);

-- Clean up
DROP TABLE IF EXISTS duplicate_transactions; 