/*
  # Update settings schema for quadrant configuration

  1. Changes
    - Add new default settings for quadrant layout
    - Include configuration for each quadrant's content type and selection
    - Preserve existing settings if present
    
  2. Notes
    - Each quadrant can be configured as either image carousel or iframe
    - Content selection is optional (falls back to first available)
*/

-- Update or insert default settings with quadrant configuration
INSERT INTO settings (id, value)
VALUES (
  'slideshow_settings',
  json_build_object(
    'duration', 10,
    'transition', 'fade',
    'showControls', true,
    'layoutMode', 'regular',
    'quadrantConfig', json_build_object(
      'topLeft', json_build_object('type', 'image', 'contentId', null),
      'topRight', json_build_object('type', 'image', 'contentId', null),
      'bottomLeft', json_build_object('type', 'image', 'contentId', null),
      'bottomRight', json_build_object('type', 'image', 'contentId', null)
    )
  )::text
)
ON CONFLICT (id) DO UPDATE
SET value = CASE
  WHEN settings.value IS NULL THEN EXCLUDED.value
  ELSE settings.value
END;