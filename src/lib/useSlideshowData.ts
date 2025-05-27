import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Database } from './database.types';

type ContentItem = Database['public']['Tables']['content_items']['Row'];
type Settings = {
  duration: number;
  transition: 'fade' | 'slide' | 'zoom';
  showControls: boolean;
  layoutMode: 'regular' | 'quadrant';
  quadrantIframeId?: string | null; // ID of the ContentItem to display in the quadrant's iframe slot
};

const defaultSettings: Settings = {
  duration: 10,
  transition: 'fade',
  showControls: true,
  layoutMode: 'regular',
  quadrantIframeId: null,
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
          .eq('id', 'slideshow_settings') // Assuming 'slideshow_settings' stores the whole object
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116: No rows found
          console.error('Error fetching settings:', settingsError);
          // Keep default settings if none are found or there's an error (excluding "No rows found")
        }

        if (settingsData && settingsData.value) {
          try {
            const parsedSettings = JSON.parse(settingsData.value as string);
            setSettings(prevSettings => ({ ...prevSettings, ...parsedSettings }));
          } catch (parseError) {
            console.error('Error parsing settings:', parseError);
            // Keep default/previous settings if parsing fails
          }
        }
      } catch (err: any) {
        setError(`Failed to load slideshow data. Please refresh the page. Error: ${err.message}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    const contentSubscription = supabase
      .channel('content_changes_slideshow_data')
      .on<ContentItem>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_items' },
        (payload) => {
          // console.log('Content change received:', payload);
          fetchData(); // Refetch all data on any change
        }
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
          // console.log('Settings change received:', payload);
          if (payload.new && typeof payload.new.value === 'string') {
            try {
              const newSettings = JSON.parse(payload.new.value);
              setSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
            } catch (parseError) {
              console.error('Error parsing settings update:', parseError);
            }
          } else if (payload.new && typeof payload.new.value === 'object') {
             // If value is already an object (e.g. from a direct JS update)
            setSettings(prevSettings => ({ ...prevSettings, ...(payload.new.value as Partial<Settings>) }));
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
