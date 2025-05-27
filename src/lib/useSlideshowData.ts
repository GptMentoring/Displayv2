import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Settings as SettingsIcon } from 'lucide-react'; // Renamed Settings to avoid conflict
import { useSlideshowData } from '../lib/useSlideshowData';
import { Database } from '../lib/database.types';

type ContentItem = Database['public']['Tables']['content_items']['Row'];
// Settings type is now primarily managed by useSlideshowData, but we might need it for props or local component state
type SlideshowSettings = ReturnType<typeof useSlideshowData>['settings'];


const Slideshow: React.FC = () => {
  const navigate = useNavigate();
  const { items, settings, isLoading, error, setSettings: updateGlobalSettings, initialized } = useSlideshowData();

  const [showControlsBar, setShowControlsBar] = useState(true); // For mouse hover controls
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0); // Progress bar state (0 to 100)

  // Handle slide rotation
  useEffect(() => {
    if (items.length === 0 || settings.layoutMode === 'quadrant' || isSettingsPanelOpen) {
      return;
    }

    // Only start interval if there are items, not in quadrant mode, and settings panel is closed
    const effectiveDuration = (settings.duration || 10) * 1000;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
        setIsTransitioning(false);
      }, 500); // Shorter than typical transition, matches animation
    }, effectiveDuration);

    return () => clearInterval(interval);
  }, [items.length, settings.duration, settings.layoutMode, isSettingsPanelOpen, settings]); // Added settings to dep array

  // Effect for progress bar
  useEffect(() => {
    if (settings.layoutMode !== 'regular' || isSettingsPanelOpen || items.length === 0 || isTransitioning) {
      if (isTransitioning) { // Reset progress to 0 when transition starts
        setProgress(0);
      }
      return;
    }

    setProgress(0); // Reset progress for new slide
    const startTime = Date.now();
    const slideDurationMs = (settings.duration || 10) * 1000;
    let animationFrameId: number;

    const updateProgress = () => {
      const elapsedTime = Date.now() - startTime;
      const currentProgress = Math.min(100, (elapsedTime / slideDurationMs) * 100);
      setProgress(currentProgress);

      if (elapsedTime < slideDurationMs) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentIndex, settings.duration, settings.layoutMode, isSettingsPanelOpen, items.length, isTransitioning, settings]); // Added settings and isTransitioning

  const handleExit = useCallback(() => {
    navigate('/admin');
  }, [navigate]);

  const getTransitionClass = useCallback(() => {
    switch (settings.transition) {
      case 'slide':
        return 'animate-slide-in';
      case 'zoom':
        return 'animate-zoom-in';
      default: // fade
        return 'animate-fade-in';
    }
  }, [settings.transition]);


  // Memoize filtered items to prevent re-calculation on every render
  const imageItems = useMemo(() => items.filter(item => item.type === 'image'), [items]);
  const iframeItems = useMemo(() => items.filter(item => item.type === 'iframe'), [items]);


  // Controls visibility logic: show if settings panel is open OR if mouse is over the slideshow
  const actualShowControls = isSettingsPanelOpen || showControlsBar;

  // Moved renderContent outside to be memoizable if needed, or to become a separate component
  // For now, it's simple enough to be inline or defined within the component body.
  // If it were more complex, React.memo and useCallback for props would be considered.

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading slideshow...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl p-4 text-center">{error}</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">No content available for slideshow. <button onClick={handleExit} className="underline">Go to Admin</button></div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const transitionStyle = 'opacity 0.5s ease-in-out';

  const renderRegularLayoutContent = () => {
    if (!currentItem) return null;
    const isActive = true; // In regular mode, the currentItem is always the one to display
    const opacity = isTransitioning && isActive ? 0 : 1;

    if (currentItem.type === 'image') {
      return (
        <img
          key={currentItem.id}
          src={currentItem.url}
          alt={`Slide ${currentIndex + 1}`}
          className={`max-h-screen max-w-full object-contain ${getTransitionClass()}`}
          style={{ opacity, transition: transitionStyle }}
        />
      );
    }
    return (
      <iframe
        key={currentItem.id}
        src={currentItem.url}
        title="Embedded content"
        className="w-full h-screen border-0"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
        referrerPolicy="origin"
        allowFullScreen
        style={{ opacity, transition: transitionStyle }}
      />
    );
  };

  const renderQuadrantLayoutContent = () => {
    // Get all available images for quadrants
    const allVisibleImages = imageItems.slice(0, 4);

    // Get selected iframes if enabled, otherwise null
    const bottomLeftIframe = settings.quadrantIframeIds.bottomLeftEnabled && settings.quadrantIframeIds.bottomLeft
      ? iframeItems.find(item => item.id === settings.quadrantIframeIds.bottomLeft)
      : null;

    const bottomRightIframe = settings.quadrantIframeIds.bottomRight
      ? iframeItems.find(item => item.id === settings.quadrantIframeIds.bottomRight)
      : iframeItems[0];

    return (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 bg-black p-1">
        {visibleImageItems.map((image, index) => (
          <div
            key={image.id}
            className="relative flex items-center justify-center bg-black"
          >
            <img
              src={image.url}
              alt={`Content ${index + 1}`}
              className={`max-h-full max-w-full object-contain ${getTransitionClass()}`}
              style={{ opacity: isTransitioning ? 0 : 1, transition: transitionStyle }}
            />
          </div>
        ))}
        {/* Fill remaining top image slots if needed */}
        {Array.from({ length: Math.max(0, 2 - allVisibleImages.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="relative flex items-center justify-center bg-black"
          >
            <div className="text-gray-500 text-sm">No image available</div>
          </div>
        ))}
        {/* IFrame quadrant */}
        {/* Bottom Left IFrame */}
        <div className="bg-gray-800 relative">
          {bottomLeftIframe ? (
            <iframe
              key={bottomLeftIframe.id}
              src={bottomLeftIframe.url}
              title={`Bottom Left - ${bottomLeftIframe.name || 'Untitled'}`}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
              referrerPolicy="origin"
              allow="fullscreen"
              allowFullScreen
              style={{ opacity: isTransitioning ? 0 : 1, transition: transitionStyle }}
            />) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              No IFrame selected
            </div>
          )}
        </div>
        
        {/* Bottom Right IFrame */}
        <div className="bg-gray-800 relative">
          {bottomRightIframe ? (
            <iframe
              key={bottomRightIframe.id}
              src={bottomRightIframe.url}
              title={`Bottom Right - ${bottomRightIframe.name || 'Untitled'}`}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
              referrerPolicy="origin"
              allow="fullscreen"
              allowFullScreen
              style={{ opacity: isTransitioning ? 0 : 1, transition: transitionStyle }}
            />) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              No IFrame selected
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      onMouseMove={() => setShowControlsBar(true)}
      onMouseLeave={() => { if (!isSettingsPanelOpen) setShowControlsBar(false);}}
    >
      {settings.layoutMode === 'quadrant' ? renderQuadrantLayoutContent() : renderRegularLayoutContent()}

      {/* Progress Bar - Only in Regular Mode */}
      {settings.layoutMode === 'regular' && items.length > 0 && !isSettingsPanelOpen && (
        <div className="fixed bottom-0 left-0 w-full h-1.5 bg-gray-700/50 z-50">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${progress}%`, transition: progress === 0 ? 'none' : 'width 0.1s linear' }}
          />
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`fixed top-0 left-0 right-0 p-4 transition-opacity duration-300 ${
          actualShowControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsPanelOpen(prev => !prev)}
              className="text-white bg-gray-800/50 hover:bg-gray-700/50 p-2 rounded-full transition-colors"
              aria-label={isSettingsPanelOpen ? 'Close settings' : 'Open settings'}
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
            {items.length > 0 && settings.layoutMode !== 'quadrant' && (
              <div className="text-white/70 text-sm tabular-nums">
                {currentIndex + 1} / {items.length}
              </div>
            )}
          </div>
          <button
            onClick={handleExit}
            className="text-white bg-gray-800/50 hover:bg-gray-700/50 p-2 rounded-full transition-colors"
            aria-label="Exit slideshow"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {isSettingsPanelOpen && (
        <div className="fixed top-16 left-4 bg-white rounded-lg shadow-xl p-6 w-96 z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Presentation Settings</h3>
            <button 
              onClick={() => setIsSettingsPanelOpen(false)} 
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
                max="60"
                value={settings.duration}
                onChange={(e) => {
                  const newDuration = parseInt(e.target.value, 10);
                  if (!isNaN(newDuration) && newDuration >= 1 && newDuration <= 60) {
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

            {settings.layoutMode === 'quadrant' && (
              <div className="space-y-4 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Quadrant Layout Configuration:</h4>
                  <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                    <li>Top-Left: Displays the 1st available image (by sort order).</li>
                    <li>Top-Right: Displays the 2nd available image.</li>
                    <li>
                      Bottom Half: Select iframes to display in bottom quadrants.
                      If none selected, defaults to first available iframes.
                    </li>
                  </ul>
                  {imageItems.length < 2 && (
                    <p className="mt-2 text-xs text-amber-700">
                      Note: Fewer than 2 images are available. Some image quadrants may be empty.
                    </p>
                  )}
                </div>
                
                {/* Bottom Left IFrame Selection */}
                <div>
                  <label htmlFor="bottomLeftIframe" className="block text-sm font-medium text-gray-700 mb-1">
                    Bottom Left IFrame {settings.quadrantIframeIds.bottomLeftEnabled ? '(Enabled)' : '(Disabled)'}
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="bottomLeftEnabled"
                        checked={settings.quadrantIframeIds.bottomLeftEnabled}
                        onChange={(e) => updateGlobalSettings(prev => ({
                          ...prev,
                          quadrantIframeIds: {
                            ...prev.quadrantIframeIds,
                            bottomLeftEnabled: e.target.checked
                          }
                        }))}
                        className="mr-2"
                      />
                      <label htmlFor="bottomLeftEnabled" className="text-sm text-gray-600">
                        Enable Bottom Left IFrame
                      </label>
                    </div>
                    {settings.quadrantIframeIds.bottomLeftEnabled && (
                      <select
                        id="bottomLeftIframe"
                        value={settings.quadrantIframeIds.bottomLeft || ''}
                        onChange={(e) => updateGlobalSettings(prev => ({
                          ...prev,
                          quadrantIframeIds: {
                            ...prev.quadrantIframeIds,
                            bottomLeft: e.target.value || null
                          }
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={iframeItems.length === 0}
                      >
                        <option value="">Select Bottom Left IFrame</option>
                        {iframeItems.map(iframe => (
                          <option key={iframe.id} value={iframe.id}>
                            {iframe.name || iframe.url} ({iframe.id.substring(0,6)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                
                {/* Bottom Right IFrame Selection */}
                <div className="mt-4">
                  <label htmlFor="bottomRightIframe" className="block text-sm font-medium text-gray-700 mb-1">
                    Bottom Right IFrame {settings.quadrantIframeIds.bottomRightEnabled ? '(Enabled)' : '(Disabled)'}
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="bottomRightEnabled"
                        checked={settings.quadrantIframeIds.bottomRightEnabled}
                        onChange={(e) => updateGlobalSettings(prev => ({
                          ...prev,
                          quadrantIframeIds: {
                            ...prev.quadrantIframeIds,
                            bottomRightEnabled: e.target.checked
                          }
                        }))}
                        className="mr-2"
                      />
                      <label htmlFor="bottomRightEnabled" className="text-sm text-gray-600">
                        Enable Bottom Right IFrame
                      </label>
                    </div>
                    {settings.quadrantIframeIds.bottomRightEnabled && (
                      <select
                        id="bottomRightIframe"
                        value={settings.quadrantIframeIds.bottomRight || ''}
                        onChange={(e) => updateGlobalSettings(prev => ({
                          ...prev,
                          quadrantIframeIds: {
                            ...prev.quadrantIframeIds,
                            bottomRight: e.target.value || null
                          }
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={iframeItems.length === 0}
                      >
                        <option value="">Select Bottom Right IFrame</option>
                        {iframeItems.map(iframe => (
                          <option key={iframe.id} value={iframe.id}>
                            {iframe.name || iframe.url} ({iframe.id.substring(0,6)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Future settings can be added here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default Slideshow;