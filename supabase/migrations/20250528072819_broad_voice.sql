/*
  # Add quadrant configuration to settings

  1. Changes
    - Updates the settings table with quadrant configuration
    - Preserves existing settings if present
    - Sets default quadrant layout configuration
    
  2. Notes
    - Each quadrant can be configured for either images or iframes
    - Content IDs can be specified or left as null for automatic selection
*/

-- Insert or update settings with quadrant configuration
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
SET value = CASE
  WHEN settings.value IS NULL THEN EXCLUDED.value
  ELSE COALESCE(
    (
      SELECT json_build_object(
        'duration', COALESCE((settings.value::json->>'duration')::int, 10),
        'transition', COALESCE(settings.value::json->>'transition', 'fade'),
        'showControls', COALESCE((settings.value::json->>'showControls')::boolean, true),
        'layoutMode', COALESCE(settings.value::json->>'layoutMode', 'regular'),
        'quadrantConfig', COALESCE(
          settings.value::json->'quadrantConfig',
          json_build_object(
            'topLeft', json_build_object('type', 'image', 'contentId', null),
            'topRight', json_build_object('type', 'image', 'contentId', null),
            'bottomLeft', json_build_object('type', 'iframe', 'contentId', null),
            'bottomRight', json_build_object('type', 'iframe', 'contentId', null)
          )
        )
      )::text
    ),
    EXCLUDED.value
  )
END;