-- Cloudflare D1 database schema for nekosama-gallery

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'graduated')), -- enrolled: 在籍生, graduated: 卒業生
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
);

-- Insert default folders
INSERT OR IGNORE INTO folders (id, name, status) VALUES 
  ('1', 'ミケ', 'enrolled'),
  ('2', 'しろ', 'enrolled');

-- Add status column to existing folders if not exists (migration)
-- This is safe to run multiple times
ALTER TABLE folders ADD COLUMN status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'graduated'));