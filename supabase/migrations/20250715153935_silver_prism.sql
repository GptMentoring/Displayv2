/*
  # Add category and tags columns to content_items table

  1. New Columns
    - `category` (content_category ENUM, NOT NULL, default 'vision_board')
    - `tags` (TEXT[], NULLABLE)

  2. Changes
    - Create content_category ENUM type with values: 'vision_board', 'kpi', 'monthly_goal'
    - Add category column with NOT NULL constraint and default value
    - Add tags column as text array for flexible tagging
    - Update existing records with default category value

  3. Security
    - Update RLS policies to handle new columns
    - Ensure proper validation for category values
*/

-- Create the ENUM type for content categories
CREATE TYPE content_category AS ENUM ('vision_board', 'kpi', 'monthly_goal');

-- Add the category column with NOT NULL constraint and default value
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS category content_category NOT NULL DEFAULT 'vision_board';

-- Add the tags column as a text array
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS tags TEXT[] NULL;

-- Update RLS policies to handle the new columns
DROP POLICY IF EXISTS "Authenticated users can insert content_items" ON content_items;
DROP POLICY IF EXISTS "Authenticated users can update content_items" ON content_items;

-- Recreate INSERT policy with category validation
CREATE POLICY "Authenticated users can insert content_items"
  ON content_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (role() = 'authenticated'::text) AND 
    (type = ANY (ARRAY['image'::text, 'iframe'::text])) AND 
    (url IS NOT NULL) AND 
    (category IS NOT NULL) AND
    (((type = 'image'::text) AND (storage_path IS NOT NULL)) OR 
     ((type = 'iframe'::text) AND (storage_path IS NULL)))
  );

-- Recreate UPDATE policy with category validation
CREATE POLICY "Authenticated users can update content_items"
  ON content_items
  FOR UPDATE
  TO authenticated
  USING (role() = 'authenticated'::text)
  WITH CHECK (
    (category IS NOT NULL) AND
    (((sort_order IS NOT NULL) AND 
      (type = (SELECT c.type FROM content_items c WHERE c.id = content_items.id)) AND 
      (url = (SELECT c.url FROM content_items c WHERE c.id = content_items.id)) AND 
      (NOT (storage_path IS DISTINCT FROM (SELECT c.storage_path FROM content_items c WHERE c.id = content_items.id)))) OR 
     ((type = ANY (ARRAY['image'::text, 'iframe'::text])) AND 
      (url IS NOT NULL) AND 
      (((type = 'image'::text) AND (storage_path IS NOT NULL)) OR 
       ((type = 'iframe'::text) AND (storage_path IS NULL)))))
  );