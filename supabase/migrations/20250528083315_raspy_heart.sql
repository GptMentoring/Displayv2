/*
  # Add categories and tags to content items

  1. Changes
    - Add category column to content_items table
    - Add tags array column to content_items table
    
  2. Details
    - category: text column for categorizing content items
    - tags: text[] array column for storing multiple tags per content item
    
  3. Security
    - Maintain existing RLS policies
*/

-- Add category column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_items' AND column_name = 'category'
  ) THEN
    ALTER TABLE content_items ADD COLUMN category text;
  END IF;
END $$;

-- Add tags column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_items' AND column_name = 'tags'
  ) THEN
    ALTER TABLE content_items ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;