/*
  # Add settings history table

  1. New Tables
    - `settings_history`: Stores historical settings values
      - `id` (uuid, primary key)
      - `settings_id` (text, references settings.id)
      - `value` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for viewing and inserting history
*/

-- Create settings history table
CREATE TABLE IF NOT EXISTS settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id text REFERENCES settings(id),
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

-- Create trigger function to store history
CREATE OR REPLACE FUNCTION store_settings_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings_history (settings_id, value)
  VALUES (OLD.id, OLD.value);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER settings_history_trigger
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION store_settings_history();