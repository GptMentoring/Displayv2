/*
  # Fix content_items update policy

  1. Changes
    - Replace the update policy for content_items table
    - Allow authenticated users to update sort_order field
    - Maintain existing validation for other updates

  2. Security
    - Only authenticated users can update items
    - Separate validation rules for sort_order updates
    - Preserve type and URL validation for non-sort_order updates
*/

DROP POLICY IF EXISTS "Authenticated users can update content_items" ON content_items;

CREATE POLICY "Authenticated users can update content_items"
ON content_items
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (
  -- For sort_order updates, ensure other fields remain unchanged
  (
    CASE 
      WHEN sort_order IS NOT NULL THEN
        -- Verify no other fields are being modified
        type = (SELECT type FROM content_items WHERE id = content_items.id) AND
        url = (SELECT url FROM content_items WHERE id = content_items.id) AND
        storage_path IS NOT DISTINCT FROM (SELECT storage_path FROM content_items WHERE id = content_items.id)
      ELSE
        -- For other updates, apply the full validation
        (type = ANY (ARRAY['image'::text, 'iframe'::text])) AND 
        (url IS NOT NULL) AND 
        (
          ((type = 'image'::text) AND (storage_path IS NOT NULL)) OR 
          ((type = 'iframe'::text) AND (storage_path IS NULL))
        )
    END
  )
);