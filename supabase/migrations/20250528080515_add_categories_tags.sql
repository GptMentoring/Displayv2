-- Create ENUM type for content categories
CREATE TYPE public.content_category AS ENUM ('vision_board', 'kpi', 'monthly_goal');

-- Add 'category' column to 'content_items' table
ALTER TABLE public.content_items
ADD COLUMN category public.content_category NOT NULL DEFAULT 'vision_board';

-- Add 'tags' column to 'content_items' table
ALTER TABLE public.content_items
ADD COLUMN tags TEXT[] NULL;

-- Update RLS policy for INSERT operations on 'content_items'
-- Drop existing policy first
DROP POLICY IF EXISTS "Authenticated users can insert content_items" ON public.content_items;
-- Recreate with new columns
CREATE POLICY "Authenticated users can insert content_items"
ON public.content_items
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  type IN ('image', 'iframe') AND
  category IN ('vision_board', 'kpi', 'monthly_goal') AND -- Ensure category is one of the defined enum values
  url IS NOT NULL AND
  ( (type = 'image' AND storage_path IS NOT NULL) OR (type = 'iframe' AND storage_path IS NULL) )
  -- No explicit check for tags needed here, can be NULL or empty array
);

-- Update RLS policy for UPDATE operations on 'content_items'
-- Drop existing policy first
DROP POLICY IF EXISTS "Authenticated users can update content_items" ON public.content_items;
-- Recreate with new columns, ensuring 'category' is validated if changed.
-- This policy attempts to merge logic from 'calm_disk.sql' for sort_order only updates.
CREATE POLICY "Authenticated users can update content_items"
ON public.content_items
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (
  auth.role() = 'authenticated' AND
  (
    -- Case 1: Only sort_order is being changed
    (
      OLD.sort_order IS DISTINCT FROM NEW.sort_order AND
      NEW.type = OLD.type AND
      NEW.url = OLD.url AND
      NEW.storage_path IS NOT DISTINCT FROM OLD.storage_path AND
      NEW.name IS NOT DISTINCT FROM OLD.name AND
      NEW.category = OLD.category AND -- category should not change in sort_order only update
      NEW.tags IS NOT DISTINCT FROM OLD.tags -- tags should not change in sort_order only update
      -- No need to check NEW.category against ENUM values if it's not changing from OLD.category
    )
    OR
    -- Case 2: Other fields are being changed
    (
      NEW.type IN ('image', 'iframe') AND
      NEW.category IN ('vision_board', 'kpi', 'monthly_goal') AND -- Validate category if it's part of the update
      NEW.url IS NOT NULL AND
      ( (NEW.type = 'image' AND NEW.storage_path IS NOT NULL) OR (NEW.type = 'iframe' AND NEW.storage_path IS NULL) )
      -- 'sort_order' can be changed here as well, along with other fields.
      -- 'tags' can be freely updated.
    )
  )
);

-- Add a default value for category for existing NULL rows if any (although NOT NULL with DEFAULT should handle new ones)
-- This is more of a safeguard, assuming new rows get 'vision_board' by default.
-- For existing rows, if 'category' was added without a default and allowed NULLs before being set to NOT NULL,
-- they would need an explicit update. However, the migration adds it as NOT NULL with a DEFAULT.
-- So, this is likely not needed but included for robustness.
UPDATE public.content_items
SET category = 'vision_board'
WHERE category IS NULL;
