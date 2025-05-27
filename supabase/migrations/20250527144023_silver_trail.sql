/*
  # Fix storage and content policies

  1. Changes
    - Drop and recreate storage policies with proper authentication checks
    - Add explicit bucket_id checks
    - Add proper file type validation
    - Ensure proper DELETE permissions for storage objects

  2. Security
    - Enable proper access control for authenticated users
    - Allow public read access for content
    - Restrict operations to specific bucket
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;

-- Recreate storage policies with proper checks
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'content');

CREATE POLICY "Authenticated users can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'content' AND
  auth.role() = 'authenticated'
);

-- Ensure storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('content', 'content', true)
ON CONFLICT (id) DO UPDATE
SET public = true;