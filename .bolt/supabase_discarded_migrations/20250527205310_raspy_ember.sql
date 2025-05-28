/*
  # Add default layout mode setting

  1. Changes
    - Add default settings for layout mode
    - Update existing slideshow settings to include layout mode
    
  2. Notes
    - Ensures layout mode is properly initialized
    - Preserves existing duration and transition settings
*/

-- Update or insert settings with layout mode
INSERT INTO settings (id, value)
VALUES (
  'slideshow_settings',
  json_build_object(
    'duration', 10,
    'transition', 'fade',
    'showControls', true,
    'layoutMode', 'regular',
    'quadrantIframeId', null
  )::text
)
ON CONFLICT (id) DO UPDATE
SET value = CASE
  WHEN settings.value IS NULL THEN EXCLUDED.value
  WHEN settings.value::json ->> 'layoutMode' IS NULL THEN 
    (json_build_object(
      'duration', (settings.value::json ->> 'duration')::int,
      'transition', COALESCE(settings.value::json ->> 'transition', 'fade'),
      'showControls', COALESCE((settings.value::json ->> 'showControls')::boolean, true),
      'layoutMode', 'regular',
      'quadrantIframeId', null
    ))::text
  ELSE settings.value
END;