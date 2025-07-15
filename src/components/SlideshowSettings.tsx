import React, { useState, useEffect } from 'react';
import { Clock, Save, Captions as TransitionIcon, Eye, RefreshCw, AlertTriangle } from 'lucide-react'; // Renamed Transition to TransitionIcon
import { supabase } from '../lib/supabase';
import { useSettingsHistory, SettingsHistoryEntry } from '../hooks/useSettingsHistory'; // Import the hook and type

// interface SettingsHistory { // This type is now SettingsHistoryEntry from the hook
//   id: string;
//   settings_id: string;
//   value: string;
//   created_at: string;
// }

interface SlideshowSettingsProps {
  initialDuration: number; // This might become part of a larger settings object fetched initially
}

type LayoutMode = 'regular' | 'quadrant';
// Define a more comprehensive settings type, aligning with SUPABASE_LOGIC.md and useSlideshowData
interface CurrentSlideshowSettings {
  duration: number;
  transition: 'fade' | 'slide' | 'zoom';
  showControls: boolean;
  layoutMode: LayoutMode;
  imageFit: 'contain' | 'cover';
  // quadrantConfig would also be part of this if edited here, but for now, assuming it's separate or not in this form
}


const SlideshowSettings: React.FC<SlideshowSettingsProps> = ({ initialDuration }) => {
  // Initialize state from a more comprehensive settings structure if available, or defaults
  // For now, we'll keep individual states and synthesize them on save.
  // Ideally, these would be part of a single settings object state.
  const [duration, setDuration] = useState(initialDuration);
  const [transition, setTransition] = useState<'fade' | 'slide' | 'zoom'>('fade');
  const [showControls, setShowControls] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('regular');
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>('contain'); // New setting

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Use the custom hook for settings history
  const { 
    settingsHistory, 
    isLoading: isHistoryLoading, 
    error: historyError, 
    fetchHistory 
  } = useSettingsHistory('slideshow_settings', 5); // Use 'slideshow_settings' as the ID

  // Fetch initial settings for the form (duration, transition etc.)
  // This is a simplified example. A more robust solution would fetch the 'slideshow_settings' object
  // and populate the form fields from it.
  useEffect(() => {
    const fetchCurrentSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('id', 'slideshow_settings')
        .single();

      if (data && data.value) {
        try {
          const currentSettings = JSON.parse(data.value) as CurrentSlideshowSettings;
          setDuration(currentSettings.duration || initialDuration);
          setTransition(currentSettings.transition || 'fade');
          setShowControls(currentSettings.showControls === undefined ? true : currentSettings.showControls);
          setLayoutMode(currentSettings.layoutMode || 'regular');
          setImageFit(currentSettings.imageFit || 'contain');
        } catch (e) {
          console.error("Error parsing current settings", e);
          // Fallback to defaults or initial props
          setDuration(initialDuration);
        }
      } else if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
        console.error("Error fetching current settings:", error.message);
      }
      // If no settings found (PGRST116 or other non-critical error), form uses default/initial values
    };
    fetchCurrentSettings();
  }, [initialDuration]);


  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setDuration(value);
  };

  const handleTransitionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTransition(e.target.value as 'fade' | 'slide' | 'zoom');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      // Synthesize the settings object to be saved
      const settingsToSave: CurrentSlideshowSettings = {
        duration,
        transition,
        showControls,
        layoutMode,
        imageFit,
        // quadrantConfig would be included here if managed by this form
      };

      const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ 
          id: 'slideshow_settings', // Save to 'slideshow_settings'
          value: JSON.stringify(settingsToSave) // Save the full settings object
        });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      setSaveStatus({
        type: 'success',
        message: 'Slideshow settings updated successfully!'
      });
      fetchHistory(); // Refresh history after successful save
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Failed to update slideshow settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-blue-600" />
        <span>Slideshow Settings</span>
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            Display Duration (seconds)
          </label>
          <input
            id="duration"
            type="number"
            min="1"
            max="300"
            value={duration}
            onChange={handleDurationChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            How long each slide will be displayed before moving to the next one (1-300 seconds)
          </p>
        </div>

        <div>
          <label htmlFor="transition" className="block text-sm font-medium text-gray-700 mb-1">
            Transition Effect
          </label>
          <div className="flex items-center gap-2 mb-1">
            <TransitionIcon className="h-4 w-4 text-gray-500" />
            <select
              id="transition"
              value={transition}
              onChange={handleTransitionChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Choose how slides transition from one to another
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Layout Mode
          </label>
          <select
            value={layoutMode}
            onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}
            className="w-full p-2 border rounded-md"
          >
            <option value="regular">Regular Slideshow</option>
            <option value="quadrant">Quadrant Layout</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Choose between regular slideshow or quadrant layout. Quadrant config is in Presentation view.
          </p>
        </div>
        
        <div>
          <label htmlFor="imageFit" className="block text-sm font-medium text-gray-700 mb-1">
            Image Fit (Regular Mode)
          </label>
          <select
            id="imageFit"
            value={imageFit}
            onChange={(e) => setImageFit(e.target.value as 'contain' | 'cover')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
          </select>
           <p className="mt-1 text-xs text-gray-500">
            How images should fit within the viewport in Regular Layout mode.
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Eye className="h-4 w-4 text-gray-500" />
            <span>Show Controls (Presentation View)</span>
          </label>
          <div className="mt-1">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showControls}
                onChange={(e) => setShowControls(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Always show controls in presentation</span>
            </label>
          </div>
        </div>

        {/* Settings History */}
        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Recent Settings Changes</h3>
            <button type="button" onClick={fetchHistory} disabled={isHistoryLoading} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50">
              <RefreshCw className={`h-3 w-3 ${isHistoryLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          {isHistoryLoading && <div className="text-sm text-gray-500">Loading history...</div>}
          {historyError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Error loading history: {historyError}
            </div>
          )}
          {!isHistoryLoading && !historyError && settingsHistory.length === 0 && (
            <div className="text-sm text-gray-500">No history found for 'slideshow_settings'.</div>
          )}
          {!isHistoryLoading && !historyError && settingsHistory.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {settingsHistory.map((entry: SettingsHistoryEntry) => {
                let parsedValue: Partial<CurrentSlideshowSettings> = {};
                try {
                  parsedValue = JSON.parse(entry.value);
                } catch (e) { console.error("Error parsing history value:", e); }
                return (
                  <div 
                    key={entry.id}
                    className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200"
                  >
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                      <span>ID: {entry.id.substring(0,8)}...</span>
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs">
                      Duration: {parsedValue.duration ?? 'N/A'}s, 
                      Transition: {parsedValue.transition ?? 'N/A'}, 
                      Layout: {parsedValue.layoutMode ?? 'N/A'},
                      Image Fit: {parsedValue.imageFit ?? 'N/A'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {saveStatus && (
          <div 
            className={`text-sm p-2 rounded-md ${
              saveStatus.type === 'success' 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}
          >
            {saveStatus.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors w-full ${
            isSaving ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </form>
    </div>
  );
};

export default SlideshowSettings;