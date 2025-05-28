import React from 'react';
import { Database, QuadrantConfig } from '../lib/database.types';
import { useMemo } from 'react';

type ContentItem = Database['public']['Tables']['content_items']['Row'];

interface QuadrantDisplayProps {
  quadrantConfig: QuadrantConfig;
  imageItems: ContentItem[];
  iframeItems: ContentItem[];
  quadrantIndices: { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number };
  getTransitionClass: () => string;
  isTransitioning: boolean;
  transitionStyle: string;
  items: ContentItem[]; // All items, used for finding items by ID
}

const QuadrantDisplay: React.FC<QuadrantDisplayProps> = ({
  quadrantConfig,
  imageItems,
  iframeItems,
  quadrantIndices,
  getTransitionClass,
  isTransitioning,
  transitionStyle,
  items, // items prop is available for finding by ID
}) => {
  // Create a map to track which image indices are used
  const usedImageIndices = useMemo(() => new Set<number>(), []);

  // Helper function to get next available image index
  const getNextAvailableImageIndex = (currentIndex: number, maxLength: number) => {
    let nextIndex = currentIndex % maxLength;
    if (imageItems.length <= 1) return nextIndex;
    
    // Try to find an unused index, but limit attempts to avoid infinite loop
    let attempts = 0;
    while (usedImageIndices.has(nextIndex) && attempts < maxLength) {
      nextIndex = (nextIndex + 1) % maxLength;
      attempts++;
    }
    
    // If we've tried all indices, clear the set and use the current index
    if (attempts >= maxLength) {
      usedImageIndices.clear();
    }
    
    usedImageIndices.add(nextIndex);
    return nextIndex;
  };

  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 bg-black p-1">
      {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((position) => {
        const config = quadrantConfig[position];
        const isImage = config.type === 'image';
        let itemToShow: ContentItem | undefined;

        if (isImage) {
          if (config.contentId) {
            const foundItem = items.find(item => item.id === config.contentId);
            if (foundItem && foundItem.type === 'image') {
              itemToShow = foundItem;
            }
          }
          // Use carousel logic if no specific content ID is set or item wasn't found
          if (!itemToShow && imageItems.length > 0) {
            const currentIndex = getNextAvailableImageIndex(quadrantIndices[position], imageItems.length);
            itemToShow = imageItems[currentIndex];
          }
        } else { // type is 'iframe'
          if (config.contentId) {
            const foundItem = items.find(item => item.id === config.contentId);
            if (foundItem && foundItem.type === 'iframe') {
              itemToShow = foundItem;
            }
          }
          // Fallback to first available iframe if no specific one is selected
          if (!itemToShow && iframeItems.length > 0) {
            itemToShow = iframeItems[0]; 
          }
        }

        return (
          <div 
            key={`${position}-${itemToShow?.id || 'empty'}`} 
            className={`relative flex items-center justify-center bg-black ${isImage ? '' : 'bg-gray-800'}`}
          >
            {itemToShow ? (
              isImage ? (
                <img
                  src={itemToShow.url}
                  alt={`${position} content - ${itemToShow.name || 'Untitled'}`}
                  className={`max-h-full max-w-full object-contain ${getTransitionClass()}`}
                  style={{ opacity: isTransitioning ? 0 : 1, transition: transitionStyle }}
                />
              ) : (
                <iframe
                  src={itemToShow.url}
                  title={`${position} - ${itemToShow.name || 'Untitled'}`}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                  referrerPolicy="origin"
                  allow="fullscreen"
                  allowFullScreen // Ensure this attribute is correctly camelCased for React if needed, but usually it's fine as lowercase
                  style={{ opacity: isTransitioning ? 0 : 1, transition: transitionStyle }}
                />
              )
            ) : (
              <div className="flex items-center justify-center text-gray-500">
                No {isImage ? 'image' : 'IFrame'} available for {position}.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default QuadrantDisplay;
