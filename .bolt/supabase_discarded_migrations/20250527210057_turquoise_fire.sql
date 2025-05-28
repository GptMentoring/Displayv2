/*
  # Update settings schema for multiple iframe selection

  1. Changes
    - Update default settings to support multiple iframe selection
    - Add quadrantIframeIds object with bottomLeft and bottomRight properties
    - Preserve existing settings while adding new structure
*/

-- Update settings with new structure for multiple iframe selection
INSERT INTO settings (id, value)
VALUES (
  'slideshow_settings',
  json_build_object(
    'duration', 10,
    'transition', 'fade',
    'showControls', true,
    'layoutMode', 'regular',
    'quadrantIframeIds', json_build_object(
      'bottomLeft', null,
      'bottomRight', null
    )
  )::text
)
ON CONFLICT (id) DO UPDATE
SET value = CASE
  WHEN settings.value IS NULL THEN EXCLUDED.value
  WHEN settings.value::json ->> 'quadrantIframeIds' IS NULL THEN 
    (json_build_object(
      'duration', COALESCE((settings.value::json ->> 'duration')::int, 10),
      'transition', COALESCE(settings.value::json ->> 'transition', 'fade'),
      'showControls', COALESCE((settings.value::json ->> 'showControls')::boolean, true),
      'layoutMode', COALESCE(settings.value::json ->> 'layoutMode', 'regular'),
      'quadrantIframeIds', json_build_object(
        'bottomLeft', null,
        'bottomRight', null
      )
    ))::text
  ELSE settings.value
END;