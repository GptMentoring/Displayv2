/*
  # Keep-Alive Function for Supabase

  This Edge Function performs a simple database operation to keep the Supabase project active
  and prevent it from being paused due to inactivity.

  ## What it does:
  1. Performs a lightweight SELECT query on the settings table
  2. Logs the activity with timestamp
  3. Returns success status

  ## Scheduled to run:
  - Every 3 days via pg_cron
  - Can also be called manually if needed
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client with service role key for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Perform a simple SELECT query to keep the database active
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('id')
      .limit(1);

    if (settingsError) {
      console.error('Settings query error:', settingsError);
    }

    // Also check content_items table
    const { data: contentData, error: contentError } = await supabase
      .from('content_items')
      .select('id')
      .limit(1);

    if (contentError) {
      console.error('Content query error:', contentError);
    }

    // Log the keep-alive activity
    const timestamp = new Date().toISOString();
    console.log(`Keep-alive executed at ${timestamp}`);
    console.log(`Settings records found: ${settingsData?.length || 0}`);
    console.log(`Content records found: ${contentData?.length || 0}`);

    // Optionally, you can also insert a keep-alive record into a dedicated table
    // This creates a permanent log of keep-alive activities
    try {
      const { error: insertError } = await supabase
        .from('settings')
        .upsert({
          id: 'last_keep_alive',
          value: timestamp
        });

      if (insertError) {
        console.error('Keep-alive log insert error:', insertError);
      }
    } catch (logError) {
      console.error('Keep-alive logging failed:', logError);
    }

    const responseData = {
      success: true,
      timestamp,
      message: 'Keep-alive executed successfully',
      settingsCount: settingsData?.length || 0,
      contentCount: contentData?.length || 0
    };

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );

  } catch (error) {
    console.error('Keep-alive function error:', error);
    
    const errorResponse = {
      success: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});