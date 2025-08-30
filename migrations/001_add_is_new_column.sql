-- Add is_new column to folders table
ALTER TABLE folders ADD COLUMN is_new INTEGER DEFAULT 0;

-- Update existing folders to have is_new = 0 (not new) by default
UPDATE folders SET is_new = 0 WHERE is_new IS NULL;