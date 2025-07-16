# Supabase Keep-Alive Setup Instructions

This document explains how to set up the automatic keep-alive system to prevent your Supabase database from being paused due to inactivity.

## Overview

The keep-alive system consists of:
1. **Edge Function** (`supabase/functions/keep-alive/index.ts`) - Performs database operations
2. **Cron Job** - Automatically calls the Edge Function every 3 days
3. **Manual Trigger** - Allows you to test the system manually

## Setup Steps

### Step 1: Enable Required Extensions

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Extensions**
3. Search for and enable these extensions:
   - `pg_cron` - For scheduling tasks
   - `pg_net` - For making HTTP requests

### Step 2: Deploy the Edge Function

The Edge Function has already been created in `supabase/functions/keep-alive/index.ts`. It will be automatically deployed to Supabase.

### Step 3: Configure the Cron Job

1. Open the file `supabase/migrations/setup_keep_alive_cron.sql`
2. Replace `YOUR_PROJECT_REF` with your actual Supabase project reference
   - You can find this in your Supabase project URL: `https://YOUR_PROJECT_REF.supabase.co`
   - For example, if your URL is `https://abcdefghijk.supabase.co`, then `YOUR_PROJECT_REF` is `abcdefghijk`

3. The migration will be automatically applied to set up the cron job

### Step 4: Verify Setup

After deployment, you can verify the setup by:

1. **Check if cron job is scheduled:**
   ```sql
   SELECT * FROM cron.job;
   ```

2. **Manually trigger keep-alive (for testing):**
   ```sql
   SELECT trigger_keep_alive();
   ```

3. **Check keep-alive logs:**
   ```sql
   SELECT * FROM settings WHERE id = 'last_keep_alive';
   ```

## How It Works

- **Schedule**: The cron job runs every 3 days at 12:00 PM UTC
- **Action**: Calls the keep-alive Edge Function via HTTP POST
- **Function**: Performs simple SELECT queries on your tables
- **Logging**: Records the last keep-alive timestamp in the settings table

## Monitoring

You can monitor the keep-alive system by:

1. **Checking the last execution:**
   ```sql
   SELECT value FROM settings WHERE id = 'last_keep_alive';
   ```

2. **Viewing cron job history:**
   ```sql
   SELECT * FROM cron.job_run_details WHERE jobname = 'keep-alive-job' ORDER BY start_time DESC LIMIT 10;
   ```

## Troubleshooting

### If the cron job isn't working:

1. Verify extensions are enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
   ```

2. Check if the job is scheduled:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'keep-alive-job';
   ```

3. Test the Edge Function manually:
   - Go to your Supabase Dashboard → Edge Functions
   - Find the `keep-alive` function and test it

### If you need to update the schedule:

```sql
-- Remove existing job
SELECT cron.unschedule('keep-alive-job');

-- Create new job with different schedule
SELECT cron.schedule('keep-alive-job', 'NEW_CRON_EXPRESSION', 'SQL_COMMAND');
```

## Benefits

- **Prevents database pausing** due to inactivity
- **Automatic operation** - no manual intervention needed
- **Lightweight** - minimal resource usage
- **Logged activity** - you can track when it runs
- **Manual testing** - you can trigger it manually if needed

The system will keep your Supabase project active indefinitely, ensuring your slideshow application remains available 24/7.