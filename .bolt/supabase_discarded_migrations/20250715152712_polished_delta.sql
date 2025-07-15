/*
  # Fix database schema and initialize default settings

  1. Database Schema Updates
    - Create content_category ENUM type
    - Add category column to content_items with default value
    - Add tags column to content_items as text array
    - Update existing records with appropriate defaults

  2. Settings Initialization
    - Insert default slideshow_settings if not exists
    - Ensure proper JSON structure for all settings

  3. Security
    - Update RLS policies to handle new columns
    - Maintain existing security constraints
*/

-- Create ENUM type for content categories
DO $$ BEGIN
    CREATE TYPE content_category AS ENUM ('vision_board', 'kpi', 'monthly_goal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add category column to content_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_items' AND column_name = 'category'
  ) THEN
    ALTER TABLE content_items ADD COLUMN category content_category NOT NULL DEFAULT 'vision_board';
  END IF;
END $$;

-- Add tags column to content_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_items' AND column_name = 'tags'
  ) THEN
    ALTER TABLE content_items ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Update existing records with appropriate default categories based on type
UPDATE content_items 
SET category = CASE 
  WHEN type = 'iframe' THEN 'kpi'::content_category
  ELSE 'vision_board'::content_category
END
WHERE category = 'vision_board'::content_category;

-- Insert default slideshow_settings if not exists
INSERT INTO settings (id, value) VALUES (
  'slideshow_settings', 
  '{
    "duration": 10,
    "transition": "fade",
    "showControls": true,
    "layoutMode": "regular",
    "imageFit": "contain",
    "quadrantConfig": {
      "topLeft": {"type": "image", "contentId": null},
      "topRight": {"type": "image", "contentId": null},
      "bottomLeft": {"type": "iframe", "contentId": null},
      "bottomRight": {"type": "iframe", "contentId": null}
    }
  }'
) ON CONFLICT (id) DO NOTHING;

-- Update RLS policies for content_items to handle new columns
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
    (tags IS NOT NULL) AND
    (((type = 'image'::text) AND (storage_path IS NOT NULL)) OR 
     ((type = 'iframe'::text) AND (storage_path IS NULL)))
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
        (category = (SELECT c.category FROM content_items c WHERE c.id = content_items.id)) AND
        (tags = (SELECT c.tags FROM content_items c WHERE c.id = content_items.id))
      )
      ELSE (
        (type = ANY (ARRAY['image'::text, 'iframe'::text])) AND 
        (url IS NOT NULL) AND 
        (category IS NOT NULL) AND
        (tags IS NOT NULL) AND
        (((type = 'image'::text) AND (storage_path IS NOT NULL)) OR 
         ((type = 'iframe'::text) AND (storage_path IS NULL)))
      )
    END
  );