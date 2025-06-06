import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Database, QuadrantConfig } from './database.types';

type ContentItem = Database['public']['Tables']['content_items']['Row'];
type Settings = {
  duration: number;
  transition: 'fade' | 'slide' | 'zoom';
  showControls: boolean;
  layoutMode: 'regular' | 'quadrant';
  quadrantConfig: QuadrantConfig;
};

const defaultSettings: Settings = {
  duration: 10,
  transition: 'fade',
  showControls: true,
  layoutMode: 'regular',
  quadrantConfig: {
    topLeft: { type: 'image', contentId: null },
    topRight: { type: 'image', contentId: null },
    bottomLeft: { type: 'iframe', contentId: null },
    bottomRight: { type: 'iframe', contentId: null }
  }
};

export const useSlideshowData = () => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          throw new Error(`Content fetch error: ${contentError.message}`);
        }
        setItems(contentData || []);

        // Fetch settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('value')
          .eq('id', 'slideshow_settings')
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error('Error fetching settings:', settingsError);
        }

        if (settingsData?.value) {
          try {
            const parsedSettings = JSON.parse(settingsData.value);
            setSettings(prevSettings => ({
              ...prevSettings,
              ...parsedSettings,
              quadrantConfig: {
                ...prevSettings.quadrantConfig,
                ...parsedSettings.quadrantConfig
              }
            }));
          } catch (parseError) {
            console.error('Error parsing settings:', parseError);
          }
        }
      } catch (err: any) {
        setError(`Failed to load slideshow data: ${err.message}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscriptions
    const contentSubscription = supabase
      .channel('content_changes_slideshow_data')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_items' },
        fetchData
      )
      .subscribe();

    const settingsSubscription = supabase
      .channel('settings_changes_slideshow_data')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'settings',
          filter: 'id=eq.slideshow_settings',
        },
        (payload) => {
          if (payload.new && typeof payload.new.value === 'string') {
            try {
              const newSettings = JSON.parse(payload.new.value);
              setSettings(prevSettings => ({
                ...prevSettings,
                ...newSettings,
                quadrantConfig: {
                  ...prevSettings.quadrantConfig,
                  ...newSettings.quadrantConfig
                }
              }));
            } catch (parseError) {
              console.error('Error parsing settings update:', parseError);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contentSubscription);
      supabase.removeChannel(settingsSubscription);
    };
  }, []);

  return { items, settings, isLoading, error, setSettings };
};