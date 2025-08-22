# Cloudflare D1 Database Fix Commands

Run these commands in your Cloudflare dashboard D1 database console to fix the status column issues:

## 1. First, check if the status column exists
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='folders';
```

## 2. If status column doesn't exist, add it
```sql
ALTER TABLE folders ADD COLUMN status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'graduated'));
```

## 3. Update any NULL or invalid status values
```sql
UPDATE folders 
SET status = 'enrolled' 
WHERE status IS NULL OR status NOT IN ('enrolled', 'graduated');
```

## 4. Set specific statuses for default folders
```sql
UPDATE folders 
SET status = 'enrolled' 
WHERE id = '1' AND name = 'ミケ';

UPDATE folders 
SET status = 'graduated' 
WHERE id = '2' AND name = 'しろ';
```

## 5. Verify the results
```sql
SELECT id, name, status, display_order, created_at FROM folders ORDER BY display_order;
```

## Alternative: If you want to start fresh (WARNING: This will delete all data)
```sql
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS photos;
```

Then run the schema.sql to recreate tables with proper structure.