import React from 'react';
import { X } from 'lucide-react';
import { Database } from '../lib/database.types'; // For ContentItem
import { QuadrantConfig } from '../lib/database.types'; // For QuadrantConfig part of SlideshowSettings

// Define ContentItem based on Database types
type ContentItem = Database['public']['Tables']['content_items']['Row'];

// Define SlideshowSettings based on its usage in Slideshow.tsx and expected structure from useSlideshowData
// This should align with what useSlideshowData provides.
export interface SlideshowSettings {
  duration: number;
  transition: 'fade' | 'slide' | 'zoom';
  layoutMode: 'regular' | 'quadrant';
  quadrantConfig: QuadrantConfig; // Imported from database.types.ts
  imageFit: 'contain' | 'cover'; // Added as per SUPABASE_LOGIC.md
  // Potentially other settings like showControls could be here if managed globally
}

interface SlideshowSettingsPanelProps {
  settings: SlideshowSettings;
  updateGlobalSettings: React.Dispatch<React.SetStateAction<SlideshowSettings>>;
  onClose: () => void;
  imageItems: ContentItem[];
  iframeItems: ContentItem[];
}

const SlideshowSettingsPanel: React.FC<SlideshowSettingsPanelProps> = ({
  settings,
  updateGlobalSettings,
  onClose,
  imageItems,
  iframeItems,
}) => {
  return (
    <div className="fixed top-16 left-4 bg-white rounded-lg shadow-xl p-6 w-96 z-50 max-h-[calc(100vh-5rem)] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Presentation Settings</h3>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close settings panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="transitionEffect" className="block text-sm font-medium text-gray-700 mb-1">
            Transition Effect
          </label>
          <select
            id="transitionEffect"
            value={settings.transition}
            onChange={(e) => updateGlobalSettings(prev => ({
              ...prev,
              transition: e.target.value as SlideshowSettings['transition']
            }))}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="zoom">Zoom</option>
          </select>
        </div>

        <div>
          <label htmlFor="slideDuration" className="block text-sm font-medium text-gray-700 mb-1">
            Slide Duration (seconds)
          </label>
          <input
            type="number"
            id="slideDuration"
            min="1"
            max="600" // Increased max for longer KPI displays
            value={settings.duration}
            onChange={(e) => {
              const newDuration = parseInt(e.target.value, 10);
              if (!isNaN(newDuration) && newDuration >= 1 && newDuration <= 600) {
                updateGlobalSettings(prev => ({ ...prev, duration: newDuration }));
              }
            }}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label htmlFor="layoutMode" className="block text-sm font-medium text-gray-700 mb-1">
            Layout Mode
          </label>
          <select
            id="layoutMode"
            value={settings.layoutMode}
            onChange={(e) => updateGlobalSettings(prev => ({
              ...prev,
              layoutMode: e.target.value as SlideshowSettings['layoutMode']
            }))}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="regular">Regular (Single View)</option>
            <option value="quadrant">Quadrant</option>
          </select>
        </div>

        {settings.layoutMode === 'regular' && (
           <div>
             <label htmlFor="imageFit" className="block text-sm font-medium text-gray-700 mb-1">
               Image Fit (Regular Mode)
             </label>
             <select
               id="imageFit"
               value={settings.imageFit || 'contain'} // Default to 'contain' if not set
               onChange={(e) => updateGlobalSettings(prev => ({
                 ...prev,
                 imageFit: e.target.value as SlideshowSettings['imageFit']
               }))}
               className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
             >
               <option value="contain">Contain</option>
               <option value="cover">Cover</option>
             </select>
           </div>
        )}

        {settings.layoutMode === 'quadrant' && (
          <div className="space-y-4 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-4">Quadrant Layout Configuration</h4>
              {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((position) => {
                const currentQuadrantSettings = settings.quadrantConfig[position];
                return (
                  <div key={position} className="mb-6 last:mb-0">
                    <h5 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                      {position.replace(/([A-Z])/g, ' $1').trim()}
                    </h5>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Content Type
                        </label>
                        <select
                          value={currentQuadrantSettings.type}
                          onChange={(e) => updateGlobalSettings(prev => {
                            const newType = e.target.value as 'image' | 'iframe';
                            return {
                              ...prev,
                              quadrantConfig: {
                                ...prev.quadrantConfig,
                                [position]: {
                                  type: newType,
                                  contentId: null // Reset contentId when type changes
                                }
                              }
                            };
                          })}
                          className="w-full p-2 text-sm border border-gray-300 rounded-md"
                        >
                          <option value="image">Image Carousel</option>
                          <option value="iframe">Specific IFrame</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Content Selection
                        </label>
                        <select
                          value={currentQuadrantSettings.contentId || ''}
                          onChange={(e) => updateGlobalSettings(prev => ({
                            ...prev,
                            quadrantConfig: {
                              ...prev.quadrantConfig,
                              [position]: {
                                ...prev.quadrantConfig[position],
                                contentId: e.target.value || null
                              }
                            }
                          }))}
                          className="w-full p-2 text-sm border border-gray-300 rounded-md"
                          disabled={currentQuadrantSettings.type === 'image'} // Image carousel is auto, specific content for iframe
                        >
                          <option value="">
                            {currentQuadrantSettings.type === 'image' ? "Automatic Carousel" : "Select IFrame..."}
                          </option>
                          {currentQuadrantSettings.type === 'iframe' && iframeItems.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name || item.url.substring(0, 50)} ({item.id.substring(0,6)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideshowSettingsPanel;
