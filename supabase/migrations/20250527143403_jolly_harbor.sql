/*
  # Add default slideshow duration

  1. Changes
    - Insert default slideshow duration of 10 seconds
    
  2. Notes
    - This ensures the application has an initial duration setting
    - The value can be updated later through the admin interface
*/

INSERT INTO settings (id, value)
VALUES ('slideshow_duration', '10')
ON CONFLICT (id) DO UPDATE
SET value = EXCLUDED.value;