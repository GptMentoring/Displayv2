/*
  # Fix content items RLS policy for reordering

  1. Changes
    - Replace the existing UPDATE policy with a more permissive one that allows:
      - Updating sort_order independently
      - Updating content type and URL with existing validation
  
  2. Security
    - Maintains authentication requirement
    - Preserves type validation
    - Allows sort_order updates without other field restrictions
*/

DROP POLICY IF EXISTS "Authenticated users can update content_items" ON content_items;

CREATE POLICY "Authenticated users can update content_items"
ON content_items
FOR UPDATE
TO authenticated
USING (role() = 'authenticated'::text)
WITH CHECK (
  -- Allow updating just the sort_order
  (
    sort_order IS NOT NULL AND
    type = (SELECT c.type FROM content_items c WHERE c.id = content_items.id) AND
    url = (SELECT c.url FROM content_items c WHERE c.id = content_items.id) AND
    storage_path IS NOT DISTINCT FROM (SELECT c.storage_path FROM content_items c WHERE c.id = content_items.id)
  )
  OR
  -- Or allow updating content with type validation
  (
    type = ANY (ARRAY['image'::text, 'iframe'::text]) AND
    url IS NOT NULL AND
    (
      (type = 'image'::text AND storage_path IS NOT NULL) OR
      (type = 'iframe'::text AND storage_path IS NULL)
    )
  )
);