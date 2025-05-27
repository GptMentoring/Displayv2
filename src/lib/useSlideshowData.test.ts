// src/lib/useSlideshowData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSlideshowData } from './useSlideshowData';
import { supabase, resetSupabaseMocks } from '../__mocks__/supabase'; // Ensure this path is correct

// Default settings structure for reference
const defaultSettings = {
  duration: 10,
  transition: 'fade',
  showControls: true,
  layoutMode: 'regular',
  quadrantIframeId: null,
};

// Sample content items
const mockContentItems = [
  { id: '1', type: 'image', url: 'http://example.com/image1.jpg', storage_path: 'path1', created_at: new Date().toISOString(), sort_order: 0, name: 'Image 1' },
  { id: '2', type: 'iframe', url: 'http://example.com/iframe1.html', storage_path: null, created_at: new Date().toISOString(), sort_order: 1, name: 'Iframe 1' },
];

// Sample settings from DB
const mockDbSettings = {
  duration: 20,
  transition: 'slide',
  showControls: false,
  layoutMode: 'quadrant',
  quadrantIframeId: 'iframe-123',
};

describe('useSlideshowData Hook', () => {
  beforeEach(() => {
    resetSupabaseMocks(); // Reset all Supabase mocks before each test
  });

  test('should initialize with loading state and then fetch data successfully', async () => {
    // Mock successful data fetching
    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'content_items') {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: mockContentItems, error: null }));
      } else if (tableName === 'settings') {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: { id: 'slideshow_settings', value: JSON.stringify(mockDbSettings) }, error: null }));
      }
      return supabase; // Return the mocked client for chaining
    });
     // For the .single() call on settings
    supabase.single.mockImplementation(() => {
        return { data: { id: 'slideshow_settings', value: JSON.stringify(mockDbSettings) }, error: null };
    });


    const { result } = renderHook(() => useSlideshowData());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.settings).toEqual(defaultSettings); // Initial default settings

    // Wait for effects to run and state to update
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual(mockContentItems);
      // Settings should be a merge of default and fetched
      expect(result.current.settings).toEqual({
        ...defaultSettings, // Default settings as base
        ...mockDbSettings,   // Overridden by fetched DB settings
      });
      expect(result.current.error).toBeNull();
    });

    // Verify Supabase calls
    expect(supabase.from).toHaveBeenCalledWith('content_items');
    expect(supabase.from).toHaveBeenCalledWith('settings');
    expect(supabase.eq).toHaveBeenCalledWith('id', 'slideshow_settings');
    expect(supabase.single).toHaveBeenCalledTimes(1); // For settings
  });

  test('should handle error when fetching content items', async () => {
    const contentError = { message: 'Failed to fetch content', code: '500' };
    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'content_items') {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: null, error: contentError }));
      } else if (tableName === 'settings') {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: { id: 'slideshow_settings', value: JSON.stringify(mockDbSettings) }, error: null }));
      }
      return supabase;
    });
    supabase.single.mockImplementation(() => { // for settings
        return { data: { id: 'slideshow_settings', value: JSON.stringify(mockDbSettings) }, error: null };
    });


    const { result } = renderHook(() => useSlideshowData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual([]);
      expect(result.current.error).toMatch(/Failed to load slideshow data/); // Check for part of the error message
      expect(result.current.settings).toEqual({...defaultSettings, ...mockDbSettings}); // Settings might still load
    });
  });

  test('should handle error when fetching settings (not PGRST116)', async () => {
    const settingsError = { message: 'Settings fetch failed', code: '500' };
     supabase.from.mockImplementation((tableName) => {
      if (tableName === 'content_items') {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: mockContentItems, error: null }));
      } else if (tableName === 'settings') {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: null, error: settingsError })); // This will be overridden by .single()
      }
      return supabase;
    });
    // Mock .single() to return the error for settings
    supabase.single.mockImplementation(() => {
        return { data: null, error: settingsError };
    });

    const { result } = renderHook(() => useSlideshowData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual(mockContentItems); // Content items should still load
      expect(result.current.settings).toEqual(defaultSettings); // Should use default settings
      // Error state might or might not be set depending on how critical settings fetch is considered
      // The hook currently logs an error but doesn't set result.current.error for settings fetch failure
      // unless it's a general catch-all. Let's verify the console error was called.
      // For this test, we'll assume the overall error state is not set by settings-only failure.
      expect(result.current.error).toBeNull(); 
      // We can check if console.error was called if we mock it.
    });
     expect(supabase.single).toHaveBeenCalledTimes(1);
  });

  test('should use default settings if no settings found in DB (PGRST116)', async () => {
     const settingsNotFoundError = { message: 'No rows found', code: 'PGRST116' };
     supabase.from.mockImplementation((tableName) => {
      if (tableName === 'content_items') {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: mockContentItems, error: null }));
      } else if (tableName === 'settings') {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: null, error: settingsNotFoundError })); // Overridden by .single()
      }
      return supabase;
    });
    supabase.single.mockImplementation(() => {
        return { data: null, error: settingsNotFoundError };
    });

    const { result } = renderHook(() => useSlideshowData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual(mockContentItems);
      expect(result.current.settings).toEqual(defaultSettings); // Should use default settings
      expect(result.current.error).toBeNull();
    });
    expect(supabase.single).toHaveBeenCalledTimes(1);
  });
  
  test('setSettings should update settings state', async () => {
    // Mock initial successful fetch
    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'content_items') {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: mockContentItems, error: null }));
      } else if (tableName === 'settings') {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: { id: 'slideshow_settings', value: JSON.stringify(defaultSettings) }, error: null }));
      }
      return supabase;
    });
    supabase.single.mockImplementation(() => {
        return { data: { id: 'slideshow_settings', value: JSON.stringify(defaultSettings) }, error: null };
    });

    const { result } = renderHook(() => useSlideshowData());

    // Wait for initial data load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newPartialSettings: Partial<typeof defaultSettings> = { duration: 30, layoutMode: 'quadrant' };

    act(() => {
      result.current.setSettings(prev => ({ ...prev, ...newPartialSettings }));
    });

    expect(result.current.settings.duration).toBe(30);
    expect(result.current.settings.layoutMode).toBe('quadrant');
    // Other settings should remain from the initial load (defaultSettings in this setup)
    expect(result.current.settings.transition).toBe(defaultSettings.transition);
  });

  test('should subscribe to and unsubscribe from Supabase channels', async () => {
    supabase.from.mockImplementation((tableName) => {
        // @ts-ignore
        supabase.then = jest.fn((callback) => callback({ data: [], error: null }));
        return supabase;
    });
    supabase.single.mockImplementation(() => { // for settings
        return { data: { id: 'slideshow_settings', value: JSON.stringify(defaultSettings) }, error: null };
    });

    const { unmount } = renderHook(() => useSlideshowData());

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith('content_changes_slideshow_data');
      expect(supabase.channel).toHaveBeenCalledWith('settings_changes_slideshow_data');
      // @ts-ignore
      const contentChannelMock = supabase.channel.mock.results[0].value;
      // @ts-ignore
      const settingsChannelMock = supabase.channel.mock.results[1].value;
      
      expect(contentChannelMock.on).toHaveBeenCalledWith('postgres_changes', expect.anything(), expect.any(Function));
      expect(contentChannelMock.subscribe).toHaveBeenCalled();
      
      expect(settingsChannelMock.on).toHaveBeenCalledWith('postgres_changes', expect.anything(), expect.any(Function));
      expect(settingsChannelMock.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
    // @ts-ignore
    const contentChannelInstance = supabase.channel.mock.results[0].value;
    // @ts-ignore
    const settingsChannelInstance = supabase.channel.mock.results[1].value;
    // Check if removeChannel was called with the channel instances
    // This part of the mock might need refinement if we want to assert on the specific channel objects.
    // For now, checking the count is a good indicator.
  });
});
