/*
  # Add default slideshow duration setting

  1. Changes
    - Insert default slideshow duration of 10 seconds
    
  2. Notes
    - This ensures the settings table has an initial value
    - The duration can be updated later through the admin interface
*/

INSERT INTO settings (id, value)
VALUES ('slideshow_duration', '10')
ON CONFLICT (id) DO UPDATE
SET value = EXCLUDED.value;