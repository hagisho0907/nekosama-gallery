-- Database migration to fix status column issues
-- Run this on your Cloudflare D1 database to fix any existing data issues

-- Update any NULL or invalid status values to 'enrolled'
UPDATE folders 
SET status = 'enrolled' 
WHERE status IS NULL OR status NOT IN ('enrolled', 'graduated');

-- Ensure proper display_order values
UPDATE folders 
SET display_order = 1 
WHERE id = '1' AND (display_order IS NULL OR display_order = 0);

UPDATE folders 
SET display_order = 2 
WHERE id = '2' AND (display_order IS NULL OR display_order = 0);

-- Set specific statuses for default folders if they exist
UPDATE folders 
SET status = 'enrolled' 
WHERE id = '1' AND name = 'ミケ';

UPDATE folders 
SET status = 'graduated' 
WHERE id = '2' AND name = 'しろ';