/*
  # Add settings history table and trigger

  1. New Tables
    - `settings_history`
      - `id` (uuid, primary key)
      - `settings_id` (text, references settings.id)
      - `value` (text)
      - `created_at` (timestamptz)

  2. Changes
    - Create trigger to automatically track settings changes
    - Add index for efficient querying
*/

-- Drop existing objects if they exist to ensure clean state
DROP TRIGGER IF EXISTS settings_history_trigger ON settings;
DROP FUNCTION IF EXISTS add_settings_history();

-- Create settings history table if it doesn't exist
CREATE TABLE IF NOT EXISTS settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id text REFERENCES settings(id) ON DELETE CASCADE,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_settings_history_settings_id_created_at 
ON settings_history(settings_id, created_at DESC);

-- Create trigger function
CREATE OR REPLACE FUNCTION add_settings_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings_history (settings_id, value)
  VALUES (NEW.id, NEW.value);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER settings_history_trigger
  AFTER INSERT OR UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION add_settings_history();