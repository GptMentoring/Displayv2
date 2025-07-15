/*
  # Fix content items RLS policy for sort order updates
  
  1. Changes
    - Drop and recreate update policy for content_items
    - Add proper validation for sort_order updates
    - Fix RLS policy to allow authenticated users to update sort_order
  
  2. Security
    - Maintains RLS protection
    - Allows authenticated users to update sort_order
    - Preserves data integrity checks
*/

-- Drop existing update policy
DROP POLICY IF EXISTS "Authenticated users can update content_items" ON content_items;

-- Create new update policy with proper validation for sort_order updates
CREATE POLICY "Authenticated users can update content_items"
ON content_items
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (
  -- For sort_order updates, only allow updating sort_order field
  (
    sort_order IS NOT NULL AND
    type = (SELECT c.type FROM content_items c WHERE c.id = content_items.id) AND
    url = (SELECT c.url FROM content_items c WHERE c.id = content_items.id) AND
    storage_path IS NOT DISTINCT FROM (SELECT c.storage_path FROM content_items c WHERE c.id = content_items.id)
  )
  OR
  -- For other updates, apply standard validation
  (
    type = ANY (ARRAY['image'::text, 'iframe'::text]) AND
    url IS NOT NULL AND
    (
      (type = 'image'::text AND storage_path IS NOT NULL) OR
      (type = 'iframe'::text AND storage_path IS NULL)
    )
  )
);