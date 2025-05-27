import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type ContentItem = Database['public']['Tables']['content_items']['Row'];
type Settings = {
  duration: number;
  transition: 'fade' | 'slide' | 'zoom';
  showControls: boolean;
  layoutMode: 'regular' | 'quadrant';
};

const Slideshow: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [settings, setSettings] = useState<Settings>({
    duration: 10,
    transition: 'fade',
    showControls: true,
    layoutMode: 'regular'
  });
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch content items and settings
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch content items
        const { data: contentData, error: contentError } = await supabase
          .from('content_items')
          .select('*')
          .order('sort_order', { ascending: true, nullsLast: true })
          .order('created_at', { ascending: false });

        if (contentError) {
          throw new Error(contentError.message);
        }

        setItems(contentData || []);

        // Fetch duration setting
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('value')
          .eq('id', 'slideshow_duration')
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          // PGRST116 is the error code for "No rows found"
          console.error('Error fetching settings:', settingsError);
        }

        if (settingsData) {
          const parsedSettings = JSON.parse(settingsData.value);
          setSettings(parsedSettings);
        }
      } catch (err) {
        setError('Failed to load slideshow content. Please refresh the page.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription for content changes
    const contentSubscription = supabase
      .channel('content_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'content_items' }, 
        fetchData)
      .subscribe();

    // Set up subscription for settings changes
    const settingsSubscription = supabase
      .channel('settings_changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'settings', filter: 'id=eq.slideshow_duration' }, 
        fetchData)
      .subscribe();

    return () => {
      contentSubscription.unsubscribe();
      settingsSubscription.unsubscribe();
    };
  }, []);

  // Handle slide rotation
  useEffect(() => {
    if (items.length === 0 || settings.layoutMode === 'quadrant') return;

    const interval = setInterval(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
        setIsTransitioning(false);
      }, 500);
    }, settings.duration * 1000);

    return () => clearInterval(interval);
  }, [items.length, settings.duration, settings.layoutMode]);

  const handleExit = () => {
    navigate('/admin');
  };

  const getTransitionClass = () => {
    switch (settings.transition) {
      case 'slide':
        return 'animate-slide-in';
      case 'zoom':
        return 'animate-zoom-in';
      default:
        return 'animate-fade-in';
    }
  };

  const getImageItems = () => items.filter(item => item.type === 'image');
  const getIframeItems = () => items.filter(item => item.type === 'iframe');

  const renderContent = (item: ContentItem, index: number) => {
    const isActive = index === currentIndex;
    const opacity = isTransitioning && isActive ? 0 : 1;
    const transition = 'opacity 0.5s ease-in-out';

    if (item.type === 'image') {
      return (
        <img
          src={item.url}
          alt={`Slide ${index + 1}`}
          className={`max-h-screen max-w-full object-contain ${getTransitionClass()}`}
          style={{ opacity, transition }}
        />
      );
    }

    return (
      <iframe
        src={item.url}
        title="Embedded content"
        className="w-full h-screen border-0"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        referrerPolicy="origin"
        allowFullScreen
        style={{ opacity, transition }}
      />
    );
  };

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
        <div className="text-white text-xl">{error}</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">No content available for slideshow</div>
      </div>
    );
  }

  const imageItems = getImageItems();
  const iframeItem = getIframeItems()[0];

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => !isSettingsOpen && setShowControls(false)}
    >
      {settings.layoutMode === 'quadrant' ? (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 bg-black p-1">
          {/* Three Image Sections */}
          {imageItems.slice(0, 3).map((image, index) => image && (
            <div 
              key={image.id || index}
              className={`relative flex items-center justify-center bg-black ${
                index === 2 ? 'col-span-1' : ''
              }`}
            >
              <img 
                src={image.url}
                alt={`Content ${index + 1}`}
                className={`max-h-full max-w-full object-contain ${getTransitionClass()}`}
                style={{ opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.5s ease-in-out' }}
              />
            </div>
          ))}

          {/* iframe Section */}
          <div className="bg-white">
            {iframeItem && (
              <iframe
                key={iframeItem.id}
                src={iframeItem.url}
                title="Embedded content"
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                referrerPolicy="origin"
                allow="fullscreen"
                allowFullScreen
              />
            )}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            {renderContent(items[currentIndex], currentIndex)}
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`fixed top-0 left-0 right-0 p-4 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="text-white bg-gray-800/50 hover:bg-gray-700/50 p-2 rounded-full transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
            <div className="text-white/70 text-sm">
              {currentIndex + 1} / {items.length}
            </div>
          </div>
          <button
            onClick={handleExit}
            className="text-white bg-gray-800/50 hover:bg-gray-700/50 p-2 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {isSettingsOpen && (
        <div className="fixed top-16 left-4 bg-white rounded-lg shadow-lg p-4 w-80">
          <h3 className="text-lg font-semibold mb-4">Presentation Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transition Effect
              </label>
              <select
                value={settings.transition}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  transition: e.target.value as Settings['transition']
                }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Slideshow;