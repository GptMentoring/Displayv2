/*
  # Setup Keep-Alive Cron Job

  This migration sets up a scheduled job using pg_cron to automatically call
  the keep-alive Edge Function every 3 days to prevent database inactivity.

  ## Prerequisites:
  1. Enable pg_cron extension in Supabase Dashboard -> Database -> Extensions
  2. Enable pg_net extension in Supabase Dashboard -> Database -> Extensions
  3. Deploy the keep-alive Edge Function first

  ## What this does:
  1. Creates a cron job that runs every 3 days
  2. Calls the keep-alive Edge Function via HTTP POST
  3. Logs the execution for monitoring

  ## Schedule:
  - Runs every 3 days at 12:00 PM UTC
  - Cron expression: '0 12 */3 * *'
*/

-- First, ensure we have the required extensions
-- Note: These need to be enabled manually in the Supabase Dashboard
-- This is just a check to see if they're available
DO $$
BEGIN
  -- Check if pg_cron is available
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron extension is not enabled. Please enable it in Supabase Dashboard -> Database -> Extensions';
  END IF;
  
  -- Check if pg_net is available  
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net extension is not enabled. Please enable it in Supabase Dashboard -> Database -> Extensions';
  END IF;
END $$;

-- Create the cron job to call keep-alive function every 3 days
-- Note: Replace 'YOUR_PROJECT_REF' with your actual Supabase project reference
-- You can find this in your Supabase project URL: https://YOUR_PROJECT_REF.supabase.co

SELECT cron.schedule(
  'keep-alive-job', -- job name
  '0 12 */3 * *',   -- cron expression: every 3 days at 12:00 PM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/keep-alive',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to manually trigger keep-alive (useful for testing)
CREATE OR REPLACE FUNCTION trigger_keep_alive()
RETURNS TABLE(request_id bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/keep-alive',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
$$;

-- Grant execute permission to authenticated users for manual triggering
GRANT EXECUTE ON FUNCTION trigger_keep_alive() TO authenticated;

-- Log that the cron job has been set up
INSERT INTO settings (id, value) 
VALUES ('keep_alive_cron_setup', to_json(now())::text)
ON CONFLICT (id) DO UPDATE SET value = to_json(now())::text;