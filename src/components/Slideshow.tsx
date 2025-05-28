import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { useSlideshowData } from '../lib/useSlideshowData';
import { Database } from '../lib/database.types';
import SlideshowSettingsPanel from './SlideshowSettingsPanel';
import QuadrantDisplay from './QuadrantDisplay'; // Import QuadrantDisplay
import { useSlideProgress } from '../hooks/useSlideProgress'; // Import the new hook

type ContentItem = Database['public']['Tables']['content_items']['Row'];

const Slideshow: React.FC = () => {
  const navigate = useNavigate();
  const { items, settings, isLoading, error, setSettings: updateGlobalSettings } = useSlideshowData();
  const [quadrantIndices, setQuadrantIndices] = useState({
    topLeft: 0,
    topRight: 0,
    bottomLeft: 0,
    bottomRight: 0,
  });
  const quadrantTimers = useRef<{ [key: string]: number }>({});
  const quadrantLastUpdate = useRef<{ [key: string]: number }>({});
  const [showControlsBar, setShowControlsBar] = useState(true);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  // const [progress, setProgress] = useState(0); // Removed: Now handled by useSlideProgress

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

  // Progress bar logic using the new hook
  const progressIsActive = 
    settings.layoutMode === 'regular' && 
    !isSettingsPanelOpen && 
    items.length > 0 && 
    !isTransitioning;

  const progressDependencies = [
    currentIndex, 
    settings.layoutMode, // if layout mode changes, progress should reset
    isSettingsPanelOpen, // if panel opens/closes, progress should reset
    items.length, // if items length changes, progress should reset
    isTransitioning // if transitioning state changes, progress should reset
    // settings.duration is passed as a direct param to the hook, so it's already a dependency there
  ];
  
  const progress = useSlideProgress(
    progressIsActive,
    settings.duration,
    progressDependencies
  );

  // Effect for quadrant image rotation
  useEffect(() => {
    if (settings.layoutMode !== 'quadrant' || isSettingsPanelOpen || imageItems.length === 0) {
      // Clear all existing timers when conditions aren't met
      Object.values(quadrantTimers.current).forEach(timer => clearInterval(timer));
      quadrantTimers.current = {};
      return;
    }

    const effectiveDuration = (settings.duration || 10) * 1000;
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;

    // Clear any existing intervals first
    Object.values(quadrantTimers.current).forEach(timer => clearInterval(timer));
    quadrantTimers.current = {};

    // Set up new intervals for each position that should rotate
    positions.forEach(position => {
      if (settings.quadrantConfig[position].type !== 'image') {
        return;
      }

      // Initialize last update time if not set
      if (!quadrantLastUpdate.current[position]) {
        quadrantLastUpdate.current[position] = Date.now();
      }

      const timer = setInterval(() => {
        const now = Date.now();
        // Ensure minimum time has passed to prevent rapid updates
        if (now - (quadrantLastUpdate.current[position] || 0) >= effectiveDuration) {
          setQuadrantIndices(prev => {
            // Get current index and calculate next one, ensuring we don't repeat
            const currentIndex = prev[position];
            let nextIndex = (currentIndex + 1) % imageItems.length;
            
            // If we have more than one image, make sure we don't show the same image
            // in multiple quadrants at the same time
            if (imageItems.length > 1) {
              const usedIndices = Object.entries(prev)
                .filter(([key, _]) => key !== position && 
                       settings.quadrantConfig[key as keyof typeof settings.quadrantConfig].type === 'image')
                .map(([_, index]) => index);
              
              while (usedIndices.includes(nextIndex)) {
                nextIndex = (nextIndex + 1) % imageItems.length;
              }
            }

            quadrantLastUpdate.current[position] = now;
            return { ...prev, [position]: nextIndex };
          });
        }
      }, Math.min(1000, effectiveDuration / 2)); // Check more frequently than the duration

      quadrantTimers.current[position] = timer;
    });

    return () => {
      Object.values(quadrantTimers.current).forEach(timer => clearInterval(timer));
      quadrantTimers.current = {};
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
        <QuadrantDisplay
          quadrantConfig={settings.quadrantConfig}
          imageItems={imageItems}
          iframeItems={iframeItems}
          quadrantIndices={quadrantIndices}
          getTransitionClass={getTransitionClass}
          isTransitioning={isTransitioning}
          transitionStyle={transitionStyle}
          items={items} 
        />
      ) : (
        currentItem && (
          currentItem.type === 'image' ? (
            <img
              key={currentItem.id}
              src={currentItem.url}
              alt={`Slide ${currentIndex + 1}`}
              className={`max-h-screen max-w-full object-contain ${getTransitionClass()}`}
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
        <SlideshowSettingsPanel
          settings={settings}
          updateGlobalSettings={updateGlobalSettings}
          onClose={() => setIsSettingsPanelOpen(false)}
          imageItems={imageItems}
          iframeItems={iframeItems}
        />
      )}
    </div>
  );
};

export default Slideshow;