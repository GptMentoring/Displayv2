/*
  # Create content items table and policies

  1. New Tables
    - `content_items`
      - `id` (uuid, primary key)
      - `type` (text, constrained to 'image' or 'iframe')
      - `url` (text)
      - `storage_path` (text, nullable)
      - `created_at` (timestamptz)
      - `sort_order` (integer, nullable)

  2. Security
    - Enable RLS on content_items table
    - Add policies for viewing, inserting, updating, and deleting content items
*/

-- Create the content_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('image', 'iframe')),
  url text NOT NULL,
  storage_path text,
  created_at timestamptz DEFAULT now(),
  sort_order integer
);

-- Enable Row Level Security
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view content_items" ON content_items;
  DROP POLICY IF EXISTS "Authenticated users can insert content_items" ON content_items;
  DROP POLICY IF EXISTS "Authenticated users can update content_items" ON content_items;
  DROP POLICY IF EXISTS "Authenticated users can delete content_items" ON content_items;
END $$;

-- Create security policies
CREATE POLICY "Anyone can view content_items"
  ON content_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert content_items"
  ON content_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update content_items"
  ON content_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete content_items"
  ON content_items
  FOR DELETE
  TO authenticated
  USING (true);