/*
  # Add missing columns to content_items table

  1. New ENUM Type
    - `content_category` with values: 'vision_board', 'kpi', 'monthly_goal'
  
  2. New Columns
    - `category` (content_category, NOT NULL, DEFAULT 'vision_board')
    - `tags` (TEXT[], NULLABLE)
  
  3. Settings Initialization
    - Insert default slideshow_settings if not exists
  
  4. Security
    - Update RLS policies to handle new columns
*/

-- Create the content_category ENUM type
CREATE TYPE content_category AS ENUM ('vision_board', 'kpi', 'monthly_goal');

-- Add the category column with default value
ALTER TABLE content_items ADD COLUMN category content_category NOT NULL DEFAULT 'vision_board';

-- Add the tags column
ALTER TABLE content_items ADD COLUMN tags TEXT[];

-- Insert default slideshow settings if they don't exist
INSERT INTO settings (id, value) 
VALUES (
  'slideshow_settings', 
  '{"duration":10,"transition":"fade","showControls":true,"layoutMode":"regular","imageFit":"contain","quadrantConfig":{"topLeft":{"type":"image","contentId":null},"topRight":{"type":"image","contentId":null},"bottomLeft":{"type":"iframe","contentId":null},"bottomRight":{"type":"iframe","contentId":null}}}'
)
ON CONFLICT (id) DO NOTHING;

-- Update RLS policies to handle new columns
DROP POLICY IF EXISTS "Authenticated users can insert content_items" ON content_items;
CREATE POLICY "Authenticated users can insert content_items"
  ON content_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (role() = 'authenticated'::text) AND 
    (type = ANY (ARRAY['image'::text, 'iframe'::text])) AND 
    (url IS NOT NULL) AND 
    (category IS NOT NULL) AND
    (((type = 'image'::text) AND (storage_path IS NOT NULL)) OR ((type = 'iframe'::text) AND (storage_path IS NULL)))
  );

DROP POLICY IF EXISTS "Authenticated users can update content_items" ON content_items;
CREATE POLICY "Authenticated users can update content_items"
  ON content_items
  FOR UPDATE
  TO authenticated
  USING (uid() IS NOT NULL)
  WITH CHECK (
    CASE
      WHEN (sort_order IS NOT NULL) THEN (
        (type = (SELECT c.type FROM content_items c WHERE c.id = content_items.id)) AND 
        (url = (SELECT c.url FROM content_items c WHERE c.id = content_items.id)) AND 
        (NOT (storage_path IS DISTINCT FROM (SELECT c.storage_path FROM content_items c WHERE c.id = content_items.id))) AND
        (category = (SELECT c.category FROM content_items c WHERE c.id = content_items.id))
      )
      ELSE (
        (type = ANY (ARRAY['image'::text, 'iframe'::text])) AND 
        (url IS NOT NULL) AND 
        (category IS NOT NULL) AND
        (((type = 'image'::text) AND (storage_path IS NOT NULL)) OR ((type = 'iframe'::text) AND (storage_path IS NULL)))
      )
    END
  );