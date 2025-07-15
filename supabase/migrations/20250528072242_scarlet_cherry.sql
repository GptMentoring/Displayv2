/*
  # Add quadrant configuration support

  1. Changes
    - Update settings table to support new quadrant configuration
    - Add default quadrant configuration settings
    
  2. Notes
    - Each quadrant can now be configured as either image carousel or iframe
    - Settings are stored as JSON in the value column
*/

-- Insert or update default quadrant configuration
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
      'bottomLeft', json_build_object('type', 'iframe', 'contentId', null),
      'bottomRight', json_build_object('type', 'iframe', 'contentId', null)
    )
  )::text
)
ON CONFLICT (id) DO UPDATE
SET value = EXCLUDED.value;