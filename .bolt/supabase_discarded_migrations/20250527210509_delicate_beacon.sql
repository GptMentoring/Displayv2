/*
  # Update settings with iframe enable/disable options

  1. Changes
    - Add bottomLeftEnabled and bottomRightEnabled flags to quadrantIframeIds
    - Set default values for new flags
    - Preserve existing settings while adding new fields
*/

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
      'bottomRight', null,
      'bottomLeftEnabled', true,
      'bottomRightEnabled', true
    )
  )::text
)
ON CONFLICT (id) DO UPDATE
SET value = CASE
  WHEN settings.value IS NULL THEN EXCLUDED.value
  WHEN settings.value::json -> 'quadrantIframeIds' -> 'bottomLeftEnabled' IS NULL THEN 
    (json_build_object(
      'duration', COALESCE((settings.value::json ->> 'duration')::int, 10),
      'transition', COALESCE(settings.value::json ->> 'transition', 'fade'),
      'showControls', COALESCE((settings.value::json ->> 'showControls')::boolean, true),
      'layoutMode', COALESCE(settings.value::json ->> 'layoutMode', 'regular'),
      'quadrantIframeIds', json_build_object(
        'bottomLeft', (settings.value::json -> 'quadrantIframeIds' ->> 'bottomLeft'),
        'bottomRight', (settings.value::json -> 'quadrantIframeIds' ->> 'bottomRight'),
        'bottomLeftEnabled', true,
        'bottomRightEnabled', true
      )
    ))::text
  ELSE settings.value
END;