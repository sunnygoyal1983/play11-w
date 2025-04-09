-- Create a unique index on (type, entryId) for contest_win transactions
-- This prevents duplicate contest_win transactions for the same entry

-- First, we need to add a PostgreSQL function to extract the entryId from metadata
-- This function will be used in the index
CREATE OR REPLACE FUNCTION get_entry_id(metadata jsonb) 
RETURNS text AS $$
BEGIN
  RETURN metadata->>'entryId';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a unique index using the function
-- The WHERE clause ensures we only apply this to contest_win transactions
CREATE UNIQUE INDEX unique_contest_win_entry
ON "Transaction" (type, get_entry_id(metadata))
WHERE type = 'contest_win' AND metadata->>'entryId' IS NOT NULL;

-- Add a comment to document the index
COMMENT ON INDEX unique_contest_win_entry IS 'Prevents duplicate contest_win transactions for the same entry'; 