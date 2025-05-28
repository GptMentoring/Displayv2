import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
// Potentially import a more specific type from database.types.ts if settings_history is added there
// For now, a local type:
export interface SettingsHistoryEntry {
  id: string; // This is the id of the history entry itself
  settings_id: string; // This refers to the id in the 'settings' table (e.g., 'slideshow_settings')
  value: string; // Usually a JSON string representing the settings object at that time
  created_at: string;
}

export const useSettingsHistory = (settingsId: string, limit: number = 5) => {
  const [settingsHistory, setSettingsHistory] = useState<SettingsHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!settingsId) {
      setSettingsHistory([]);
      setIsLoading(false);
      // setError("Settings ID is required to fetch history."); // Optional: set an error if settingsId is crucial
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('settings_history')
        .select('*')
        .eq('settings_id', settingsId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (dbError) throw dbError;
      setSettingsHistory(data || []);
    } catch (err: any) {
      console.error(`Error fetching settings history for ${settingsId}:`, err);
      setError(err.message || 'Failed to fetch history');
      setSettingsHistory([]); // Clear history on error
    } finally {
      setIsLoading(false);
    }
  }, [settingsId, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]); // fetchHistory is memoized and includes settingsId and limit as dependencies

  return { settingsHistory, isLoading, error, fetchHistory };
};
