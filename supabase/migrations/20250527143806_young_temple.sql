/*
  # Create storage bucket for content

  1. New Storage
    - Creates a new public bucket named 'content' for storing uploaded files
    - Enables public access for viewing content
    
  2. Security
    - Allows authenticated users to upload files
    - Allows public access for viewing files
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('content', 'content', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content');

CREATE POLICY "Anyone can view files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'content');