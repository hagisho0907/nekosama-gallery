-- Migration to add is_featured column to photos table
-- Run this on the production D1 database

ALTER TABLE photos ADD COLUMN is_featured INTEGER DEFAULT 0;

-- Update any existing photos to have is_featured = 0
UPDATE photos SET is_featured = 0 WHERE is_featured IS NULL;