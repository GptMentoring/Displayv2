/*
  # Fix content items RLS policies

  1. Changes
    - Drop existing RLS policies
    - Create new policies with proper validation
    - Add storage path validation for images
    - Fix policy checks for authenticated users

  2. Security
    - Maintain read access for all users
    - Restrict write operations to authenticated users
    - Add proper validation for content types
*/

-- Drop existing policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view content_items" ON content_items;
  DROP POLICY IF EXISTS "Authenticated users can insert content_items" ON content_items;
  DROP POLICY IF EXISTS "Authenticated users can update content_items" ON content_items;
  DROP POLICY IF EXISTS "Authenticated users can delete content_items" ON content_items;
END $$;

-- Create new policies with proper security checks
CREATE POLICY "Anyone can view content_items"
  ON content_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert content_items"
  ON content_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND
    type IN ('image', 'iframe') AND
    url IS NOT NULL AND
    (
      (type = 'image' AND storage_path IS NOT NULL) OR
      (type = 'iframe' AND storage_path IS NULL)
    )
  );

CREATE POLICY "Authenticated users can update content_items"
  ON content_items
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (
    type IN ('image', 'iframe') AND
    url IS NOT NULL AND
    (
      (type = 'image' AND storage_path IS NOT NULL) OR
      (type = 'iframe' AND storage_path IS NULL)
    )
  );

CREATE POLICY "Authenticated users can delete content_items"
  ON content_items
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');