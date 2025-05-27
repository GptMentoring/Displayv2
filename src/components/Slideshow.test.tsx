// src/components/Slideshow.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Slideshow from './Slideshow';
import { useSlideshowData } from '../lib/useSlideshowData'; // Will be mocked
import { useNavigate } from 'react-router-dom'; // Will be mocked

// Mock the custom hook
jest.mock('../lib/useSlideshowData');

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();

// Default mock implementation for useSlideshowData
const mockUseSlideshowData = useSlideshowData as jest.Mock;

const mockItems = [
  { id: '1', name: 'Image 1', type: 'image', url: 'http://example.com/image1.jpg', sort_order: 0, created_at: '2023-01-01T00:00:00Z', storage_path: 'path1' },
  { id: '2', name: 'Iframe 1', type: 'iframe', url: 'http://example.com/iframe1.html', sort_order: 1, created_at: '2023-01-01T00:00:00Z', storage_path: null },
  { id: '3', name: 'Image 2', type: 'image', url: 'http://example.com/image2.jpg', sort_order: 2, created_at: '2023-01-01T00:00:00Z', storage_path: 'path2' },
  { id: '4', name: 'Iframe 2', type: 'iframe', url: 'http://example.com/iframe2.html', sort_order: 3, created_at: '2023-01-01T00:00:00Z', storage_path: null },
];

const defaultMockSettings = {
  duration: 10,
  transition: 'fade',
  showControls: true,
  layoutMode: 'regular',
  quadrantIframeId: null,
};

describe('Slideshow Component', () => {
  let mockUpdateGlobalSettings: jest.Mock;

  beforeEach(() => {
    mockUpdateGlobalSettings = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockUseSlideshowData.mockReturnValue({
      items: mockItems,
      settings: { ...defaultMockSettings },
      isLoading: false,
      error: null,
      setSettings: mockUpdateGlobalSettings, // This is the 'updateGlobalSettings' in Slideshow
    });
    jest.useFakeTimers(); // Use fake timers for progress bar and transitions
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Clean up fake timers
  });

  test('renders loading state', () => {
    mockUseSlideshowData.mockReturnValueOnce({
      items: [],
      settings: { ...defaultMockSettings },
      isLoading: true,
      error: null,
      setSettings: mockUpdateGlobalSettings,
    });
    render(<Slideshow />);
    expect(screen.getByText('Loading slideshow...')).toBeInTheDocument();
  });

  test('renders error state', () => {
    mockUseSlideshowData.mockReturnValueOnce({
      items: [],
      settings: { ...defaultMockSettings },
      isLoading: false,
      error: 'Failed to load',
      setSettings: mockUpdateGlobalSettings,
    });
    render(<Slideshow />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  test('renders no content state', () => {
    mockUseSlideshowData.mockReturnValueOnce({
      items: [],
      settings: { ...defaultMockSettings },
      isLoading: false,
      error: null,
      setSettings: mockUpdateGlobalSettings,
    });
    render(<Slideshow />);
    expect(screen.getByText(/No content available for slideshow/i)).toBeInTheDocument();
  });

  describe('Progress Bar', () => {
    test('renders progress bar in regular layout mode', () => {
      render(<Slideshow />);
      // The progress bar itself is a div with style, look for its container or part of its class
      // Assuming the outer div has 'fixed bottom-0' and the inner has 'bg-blue-500'
      const progressBarContainer = document.querySelector('.fixed.bottom-0.left-0.w-full.h-1\\.5');
      expect(progressBarContainer).toBeInTheDocument();
      const progressBarInner = progressBarContainer?.querySelector('.bg-blue-500');
      expect(progressBarInner).toBeInTheDocument();
    });

    test('does not render progress bar in quadrant layout mode', () => {
      mockUseSlideshowData.mockReturnValueOnce({
        items: mockItems,
        settings: { ...defaultMockSettings, layoutMode: 'quadrant' },
        isLoading: false, error: null, setSettings: mockUpdateGlobalSettings,
      });
      render(<Slideshow />);
      const progressBarContainer = document.querySelector('.fixed.bottom-0.left-0.w-full.h-1\\.5');
      expect(progressBarContainer).not.toBeInTheDocument();
    });

    test('does not render progress bar when settings panel is open', () => {
      render(<Slideshow />);
      // Open settings panel
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      const progressBarContainer = document.querySelector('.fixed.bottom-0.left-0.w-full.h-1\\.5');
      expect(progressBarContainer).not.toBeInTheDocument();
    });

    // Testing progress bar width change over time is more complex and might require
    // fine-grained control over requestAnimationFrame or Jest's advanced timer mocks.
    // For now, we'll focus on its presence/absence.
  });

  describe('Quadrant Mode & IFrame Selection', () => {
    const quadrantSettings = { ...defaultMockSettings, layoutMode: 'quadrant' as const };

    test('renders correct IFrame based on quadrantIframeId', () => {
      mockUseSlideshowData.mockReturnValueOnce({
        items: mockItems,
        settings: { ...quadrantSettings, quadrantIframeId: '4' }, // Iframe 2
        isLoading: false, error: null, setSettings: mockUpdateGlobalSettings,
      });
      render(<Slideshow />);
      // Iframe title includes its name
      expect(screen.getByTitle('Embedded quadrant content - Iframe 2')).toBeInTheDocument();
    });

    test('falls back to first IFrame if quadrantIframeId is null', () => {
       mockUseSlideshowData.mockReturnValueOnce({
        items: mockItems,
        settings: { ...quadrantSettings, quadrantIframeId: null },
        isLoading: false, error: null, setSettings: mockUpdateGlobalSettings,
      });
      render(<Slideshow />);
      // Falls back to Iframe 1 (mockItems[1])
      expect(screen.getByTitle('Embedded quadrant content - Iframe 1')).toBeInTheDocument();
    });
    
    test('falls back to first IFrame if quadrantIframeId is invalid', () => {
       mockUseSlideshowData.mockReturnValueOnce({
        items: mockItems,
        settings: { ...quadrantSettings, quadrantIframeId: 'invalid-id' },
        isLoading: false, error: null, setSettings: mockUpdateGlobalSettings,
      });
      render(<Slideshow />);
      expect(screen.getByTitle('Embedded quadrant content - Iframe 1')).toBeInTheDocument();
    });

    test('shows "No IFrame selected or available" if no iframes exist', () => {
      mockUseSlideshowData.mockReturnValueOnce({
        items: mockItems.filter(item => item.type === 'image'), // Only images
        settings: { ...quadrantSettings, quadrantIframeId: null },
        isLoading: false, error: null, setSettings: mockUpdateGlobalSettings,
      });
      render(<Slideshow />);
      expect(screen.getByText('No IFrame selected or available')).toBeInTheDocument();
    });

    test('displays quadrant content descriptions in settings panel', () => {
      mockUseSlideshowData.mockReturnValueOnce({
        items: mockItems,
        settings: { ...quadrantSettings },
        isLoading: false, error: null, setSettings: mockUpdateGlobalSettings,
      });
      render(<Slideshow />);
      fireEvent.click(screen.getByLabelText('Open settings'));
      expect(screen.getByText('Quadrant Layout Configuration:')).toBeInTheDocument();
      expect(screen.getByText(/Top-Left: Displays the 1st available image/)).toBeInTheDocument();
      expect(screen.getByText(/Bottom-Right Quadrant IFrame Source/)).toBeInTheDocument();
    });
  });

  describe('Settings Panel', () => {
    test('opens and closes settings panel', () => {
      render(<Slideshow />);
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      expect(screen.getByText('Presentation Settings')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close settings panel');
      fireEvent.click(closeButton);
      expect(screen.queryByText('Presentation Settings')).not.toBeInTheDocument();
    });

    test('changing layout mode calls updateGlobalSettings', () => {
      render(<Slideshow />);
      fireEvent.click(screen.getByLabelText('Open settings'));
      
      const layoutModeSelect = screen.getByLabelText('Layout Mode');
      fireEvent.change(layoutModeSelect, { target: { value: 'quadrant' } });
      
      expect(mockUpdateGlobalSettings).toHaveBeenCalledTimes(1);
      // Check if the call was made with a function that updates layoutMode to 'quadrant'
      const lastCall = mockUpdateGlobalSettings.mock.calls[0][0];
      expect(lastCall(defaultMockSettings)).toEqual(expect.objectContaining({ layoutMode: 'quadrant' }));
    });

    test('changing quadrant IFrame selection calls updateGlobalSettings', () => {
      mockUseSlideshowData.mockReturnValueOnce({
        items: mockItems,
        settings: { ...defaultMockSettings, layoutMode: 'quadrant' },
        isLoading: false, error: null, setSettings: mockUpdateGlobalSettings,
      });
      render(<Slideshow />);
      fireEvent.click(screen.getByLabelText('Open settings'));
      
      const iframeSelect = screen.getByLabelText('Bottom-Right Quadrant IFrame Source');
      fireEvent.change(iframeSelect, { target: { value: '4' } }); // Select Iframe 2 (id '4')
      
      expect(mockUpdateGlobalSettings).toHaveBeenCalledTimes(1);
      const lastCall = mockUpdateGlobalSettings.mock.calls[0][0];
      expect(lastCall(defaultMockSettings)).toEqual(expect.objectContaining({ quadrantIframeId: '4' }));
    });
  });

  test('exits to admin page when exit button is clicked', () => {
    render(<Slideshow />);
    const exitButton = screen.getByLabelText('Exit slideshow');
    fireEvent.click(exitButton);
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });
});
