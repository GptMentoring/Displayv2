/*
  # Fix content items update policy

  1. Changes
    - Drop existing update policy
    - Create new update policy with proper validation rules
    - Use proper PostgreSQL syntax for row-level security
  
  2. Security
    - Only authenticated users can update items
    - Separate validation for sort_order updates
    - Maintain type and URL validation for other updates
*/

-- Drop existing update policy
DROP POLICY IF EXISTS "Authenticated users can update content_items" ON content_items;

-- Create new update policy with fixed validation rules
CREATE POLICY "Authenticated users can update content_items"
ON content_items
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (
  CASE
    -- When only updating sort_order, validate against current values
    WHEN sort_order IS NOT NULL THEN (
      type = (SELECT c.type FROM content_items c WHERE c.id = content_items.id) AND
      url = (SELECT c.url FROM content_items c WHERE c.id = content_items.id) AND
      storage_path IS NOT DISTINCT FROM (SELECT c.storage_path FROM content_items c WHERE c.id = content_items.id)
    )
    -- For other updates, apply the full validation
    ELSE (
      (type = ANY (ARRAY['image'::text, 'iframe'::text])) AND 
      (url IS NOT NULL) AND 
      (
        ((type = 'image'::text) AND (storage_path IS NOT NULL)) OR 
        ((type = 'iframe'::text) AND (storage_path IS NULL))
      )
    )
  END
);