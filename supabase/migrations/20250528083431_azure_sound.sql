/*
  # Add category and tags columns with constraints

  1. Changes
    - Add category column with ENUM type and NOT NULL constraint
    - Add tags column as text array with default empty array
    - Add check constraint for category values
    - Set default category values based on content type
  
  2. Security
    - Update RLS policies to handle new columns
*/

-- Create category type if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_category') THEN
    CREATE TYPE content_category AS ENUM ('vision_board', 'kpi', 'monthly_goal');
  END IF;
END $$;

-- Add category column with proper type and constraints
ALTER TABLE content_items 
  ADD COLUMN IF NOT EXISTS category content_category NOT NULL DEFAULT 'vision_board';

-- Add tags column with proper type and default
ALTER TABLE content_items 
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Set default category based on content type
UPDATE content_items 
SET category = CASE 
  WHEN type = 'iframe' THEN 'kpi'::content_category 
  ELSE 'vision_board'::content_category 
END 
WHERE category = 'vision_board';

-- Update insert policy to include category validation
DROP POLICY IF EXISTS "Authenticated users can insert content_items" ON content_items;
CREATE POLICY "Authenticated users can insert content_items"
ON content_items
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  type = ANY (ARRAY['image'::text, 'iframe'::text]) AND
  url IS NOT NULL AND
  (
    (type = 'image' AND storage_path IS NOT NULL) OR
    (type = 'iframe' AND storage_path IS NULL)
  ) AND
  category IS NOT NULL AND
  tags IS NOT NULL
);

-- Update update policy to include category and tags validation
DROP POLICY IF EXISTS "Authenticated users can update content_items" ON content_items;
CREATE POLICY "Authenticated users can update content_items"
ON content_items
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (
  CASE
    WHEN (
      sort_order IS NOT NULL AND
      sort_order IS DISTINCT FROM (SELECT c.sort_order FROM content_items c WHERE c.id = content_items.id) AND
      type = (SELECT c.type FROM content_items c WHERE c.id = content_items.id) AND
      url = (SELECT c.url FROM content_items c WHERE c.id = content_items.id) AND
      storage_path IS NOT DISTINCT FROM (SELECT c.storage_path FROM content_items c WHERE c.id = content_items.id) AND
      category = (SELECT c.category FROM content_items c WHERE c.id = content_items.id) AND
      tags = (SELECT c.tags FROM content_items c WHERE c.id = content_items.id)
    ) THEN true
    ELSE (
      auth.role() = 'authenticated' AND
      type = ANY (ARRAY['image'::text, 'iframe'::text]) AND
      url IS NOT NULL AND
      (
        (type = 'image' AND storage_path IS NOT NULL) OR
        (type = 'iframe' AND storage_path IS NULL)
      ) AND
      category IS NOT NULL AND
      tags IS NOT NULL
    )
  END
);