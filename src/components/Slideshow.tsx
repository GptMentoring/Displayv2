import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { useSlideshowData } from '../lib/useSlideshowData';
import { Database, QuadrantConfig } from '../lib/database.types';

type ContentItem = Database['public']['Tables']['content_items']['Row'];
type SlideshowSettings = ReturnType<typeof useSlideshowData>['settings'];

const Slideshow: React.FC = () => {
  const navigate = useNavigate();
  const { items, settings, isLoading, error, setSettings: updateGlobalSettings } = useSlideshowData();
  const [quadrantIndices, setQuadrantIndices] = useState({
    topLeft: 0,
    topRight: 0,
    bottomLeft: 0,
    bottomRight: 0
  });
  const [showControlsBar, setShowControlsBar] = useState(true);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Memoize filtered items
  const imageItems = useMemo(() => items.filter(item => item.type === 'image'), [items]);
  const iframeItems = useMemo(() => items.filter(item => item.type === 'iframe'), [items]);

  const handleExit = useCallback(() => {
    navigate('/admin');
  }, [navigate]);

  const getTransitionClass = useCallback(() => {
    switch (settings.transition) {
      case 'slide':
        return 'animate-slide-in';
      case 'zoom':
        return 'animate-zoom-in';
      default:
        return 'animate-fade-in';
    }
  }, [settings.transition]);

  // Handle slide rotation
  useEffect(() => {
    if (items.length === 0 || settings.layoutMode === 'quadrant' || isSettingsPanelOpen) {
      return;
    }

    const effectiveDuration = (settings.duration || 10) * 1000;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
        setIsTransitioning(false);
      }, 500);
    }, effectiveDuration);

    return () => clearInterval(interval);
  }, [items.length, settings.duration, settings.layoutMode, isSettingsPanelOpen]);

  // Effect for progress bar
  useEffect(() => {
    if (settings.layoutMode !== 'regular' || isSettingsPanelOpen || items.length === 0 || isTransitioning) {
      if (isTransitioning) {
        setProgress(0);
      }
      return;
    }

    setProgress(0);
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
  }, [currentIndex, settings.duration, settings.layoutMode, isSettingsPanelOpen, items.length, isTransitioning]);

  // Effect for quadrant image rotation
  useEffect(() => {
    if (settings.layoutMode !== 'quadrant' || isSettingsPanelOpen || imageItems.length === 0) {
      return;
    }

    const effectiveDuration = (settings.duration || 10) * 1000;
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;
    
    const intervals = positions.map(position => {
      if (settings.quadrantConfig[position].type !== 'image') {
        return null;
      }

      return setInterval(() => {
        setQuadrantIndices(prev => ({
          ...prev,
          [position]: (prev[position] + 1) % imageItems.length
        }));
      }, effectiveDuration);
    });

    return () => {
      intervals.forEach(interval => interval && clearInterval(interval));
    };
  }, [settings.layoutMode, settings.duration, isSettingsPanelOpen, imageItems.length, settings.quadrantConfig]);

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
  const actualShowControls = isSettingsPanelOpen || showControlsBar;

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      onMouseMove={() => setShowControlsBar(true)}
      onMouseLeave={() => { if (!isSettingsPanelOpen) setShowControlsBar(false);}}
    >
      {settings.layoutMode === 'quadrant' ? (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 bg-black p-1">
          {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((position) => {
            const config = settings.quadrantConfig[position];
            const isImage = config.type === 'image';
            
            if (isImage) {
              const imageToShow = config.contentId 
                ? imageItems.find(item => item.id === config.contentId) 
                : imageItems[quadrantIndices[position]];

              return imageToShow ? (
                <div key={position} className="relative flex items-center justify-center bg-black">
                  <img
                    src={imageToShow.url} 
                    alt={`${position} content`} 
                    className={`max-w-full max-h-full object-contain ${getTransitionClass()}`}
                    style={{ opacity: isTransitioning ? 0 : 1, transition: transitionStyle }}
                  />
                </div>
              ) : (
                <div key={position} className="flex items-center justify-center bg-black text-gray-500">
                  No image available
                </div>
              );
            } else {
              const iframeToShow = config.contentId
                ? iframeItems.find(item => item.id === config.contentId)
                : iframeItems[0];

              return (
                <div key={position} className="bg-gray-800">
                  {iframeToShow ? (
                    <iframe
                      src={iframeToShow.url}
                      title={`${position} - ${iframeToShow.name || 'Untitled'}`}
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                      referrerPolicy="origin"
                      allow="fullscreen"
                      allowFullScreen
                      style={{ opacity: isTransitioning ? 0 : 1, transition: transitionStyle }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      No IFrame available
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
      ) : (
        currentItem && (
          currentItem.type === 'image' ? (
            <img
              key={currentItem.id}
              src={currentItem.url} 
              alt={`Slide ${currentIndex + 1}`} 
              className={`max-w-[90vw] max-h-[90vh] object-contain ${getTransitionClass()}`}
              style={{ opacity: isTransitioning ? 0 : 1, transition: transitionStyle }}
            />
          ) : (
            <iframe
              key={currentItem.id}
              src={currentItem.url}
              title="Embedded content"
              className="w-full h-screen border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
              referrerPolicy="origin"
              allowFullScreen
              style={{ opacity: isTransitioning ? 0 : 1, transition: transitionStyle }}
            />
          )
        )
      )}

      {settings.layoutMode === 'regular' && items.length > 0 && !isSettingsPanelOpen && (
        <div className="fixed bottom-0 left-0 w-full h-1.5 bg-gray-700/50 z-50">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${progress}%`, transition: progress === 0 ? 'none' : 'width 0.1s linear' }}
          />
        </div>
      )}

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
                  <h4 className="text-sm font-semibold text-gray-600 mb-4">Quadrant Layout Configuration</h4>
                  {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((position) => (
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
                            value={settings.quadrantConfig[position].type}
                            onChange={(e) => updateGlobalSettings(prev => ({
                              ...prev,
                              quadrantConfig: {
                                ...prev.quadrantConfig,
                                [position]: {
                                  type: e.target.value as 'image' | 'iframe',
                                  contentId: null
                                }
                              }
                            }))}
                            className="w-full p-2 text-sm border border-gray-300 rounded-md"
                          >
                            <option value="image">Image Carousel</option>
                            <option value="iframe">IFrame</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Content Selection
                          </label>
                          <select
                            value={settings.quadrantConfig[position].contentId || ''}
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
                          >
                            <option value="">Auto (First Available)</option>
                            {(settings.quadrantConfig[position].type === 'image' ? imageItems : iframeItems).map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name || item.url} ({item.id.substring(0,6)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Slideshow;