/*
  # Initial schema for Simple Office Show

  1. New Tables
    - `content_items`: Stores all slideshow content (images and iframes)
      - `id` (uuid, primary key)
      - `type` (text, either 'image' or 'iframe')
      - `url` (text, for public URL of image or iframe source)
      - `storage_path` (text, path in storage for images)
      - `created_at` (timestamp)
      - `sort_order` (integer, optional for manual ordering)
    - `settings`: Stores application settings
      - `id` (text, primary key)
      - `value` (text)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to perform all operations
*/

-- Create content_items table
CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('image', 'iframe')),
  url text NOT NULL,
  storage_path text,
  created_at timestamptz DEFAULT now(),
  sort_order integer
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for content_items
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
  USING (true);

CREATE POLICY "Authenticated users can delete content_items"
  ON content_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for settings
CREATE POLICY "Anyone can view settings"
  ON settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert settings"
  ON settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update settings"
  ON settings
  FOR UPDATE
  TO authenticated
  USING (true);

-- Insert default slideshow duration setting
INSERT INTO settings (id, value)
VALUES ('slideshow_duration', '10')
ON CONFLICT (id) DO NOTHING;