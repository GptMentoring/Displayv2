/*
  # Create settings table

  1. New Tables
    - `settings`
      - `id` (text, primary key)
      - `value` (text, not null)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `settings` table
    - Add policies for:
      - Anyone can view settings
      - Authenticated users can insert settings
      - Authenticated users can update settings
*/

-- Create the settings table
CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view settings" ON settings;
  DROP POLICY IF EXISTS "Authenticated users can insert settings" ON settings;
  DROP POLICY IF EXISTS "Authenticated users can update settings" ON settings;
END $$;

-- Create security policies
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
  USING (true)
  WITH CHECK (true);