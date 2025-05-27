/*
  # Add settings history table

  1. New Tables
    - `settings_history`
      - `id` (uuid, primary key)
      - `settings_id` (text, references settings.id)
      - `value` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `settings_history` table
    - Add policies for:
      - Anyone can view settings history
      - Authenticated users can insert settings history
*/

-- Create settings history table
CREATE TABLE IF NOT EXISTS settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id text REFERENCES settings(id) ON DELETE CASCADE,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view settings history"
  ON settings_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert settings history"
  ON settings_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger to automatically add history entry when settings are updated
CREATE OR REPLACE FUNCTION add_settings_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings_history (settings_id, value)
  VALUES (NEW.id, NEW.value);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_history_trigger
  AFTER INSERT OR UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION add_settings_history();