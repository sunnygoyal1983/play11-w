-- SQL script to prevent duplicate contest_win transactions
-- Run this script in your database management tool
-- This creates a unique constraint that prevents multiple contest_win transactions for the same entryId

-- Step 1: Create a function to extract entryId from metadata
CREATE OR REPLACE FUNCTION get_entry_id(metadata jsonb) 
RETURNS text AS $$
BEGIN
  RETURN metadata->>'entryId';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create a unique index on type and entryId
CREATE UNIQUE INDEX IF NOT EXISTS unique_contest_win_entry
ON "Transaction" (type, get_entry_id(metadata))
WHERE type = 'contest_win' AND metadata->>'entryId' IS NOT NULL;

-- Step 3: Add a comment to document the index
COMMENT ON INDEX unique_contest_win_entry IS 'Prevents duplicate contest_win transactions for the same entry';

-- Verify that the index was created
SELECT 
    indexname, 
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename = 'Transaction' 
    AND indexname = 'unique_contest_win_entry'; 