import React, { useState, useEffect } from 'react';
import { Clock, Save, Captions as Transition, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsHistory {
  id: string;
  settings_id: string;
  value: string;
  created_at: string;
}

interface SlideshowSettingsProps {
  initialDuration: number;
}

type LayoutMode = 'regular' | 'quadrant';

const SlideshowSettings: React.FC<SlideshowSettingsProps> = ({ initialDuration }) => {
  const [duration, setDuration] = useState(initialDuration);
  const [transition, setTransition] = useState<'fade' | 'slide' | 'zoom'>('fade');
  const [showControls, setShowControls] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('regular');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [settingsHistory, setSettingsHistory] = useState<SettingsHistory[]>([]);

  useEffect(() => {
    fetchSettingsHistory();
  }, []);

  const fetchSettingsHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('settings_history')
        .select('*')
        .eq('settings_id', 'slideshow_duration')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSettingsHistory(data || []);
    } catch (error) {
      console.error('Error fetching settings history:', error);
    }
  };

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
      const settings = {
        duration,
        transition,
        showControls,
        layoutMode
      };

      const { error } = await supabase
        .from('settings')
        .upsert({ 
          id: 'slideshow_duration',
          value: JSON.stringify(settings)
        });

      if (error) {
        throw new Error(error.message);
      }

      setSaveStatus({
        type: 'success',
        message: 'Slideshow duration updated successfully!'
      });
      fetchSettingsHistory();
    } catch (error) {
      setSaveStatus({
        type: 'error',
        message: 'Failed to update slideshow duration. Please try again.'
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
            <Transition className="h-4 w-4 text-gray-500" />
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
            Choose between regular slideshow or quadrant layout with fixed iframe
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Eye className="h-4 w-4 text-gray-500" />
            <span>Show Controls</span>
          </label>
          <div className="mt-1">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showControls}
                onChange={(e) => setShowControls(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Always show controls in presentation</span>
            </label>
          </div>
        </div>

        {/* Settings History */}
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Settings History</h3>
          <div className="space-y-2">
            {settingsHistory.map((history) => {
              const settings = JSON.parse(history.value);
              return (
                <div 
                  key={history.id}
                  className="text-sm text-gray-600 bg-gray-50 p-2 rounded"
                >
                  <div className="flex justify-between">
                    <span>Duration: {settings.duration}s</span>
                    <span className="text-gray-400">
                      {new Date(history.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Transition: {settings.transition}, 
                    Layout: {settings.layoutMode}
                  </div>
                </div>
              );
            })}
          </div>
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