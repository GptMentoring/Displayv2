import React from 'react';
import { Database, QuadrantConfig } from '../lib/database.types';

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
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 bg-black p-1">
      {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((position) => {
        const config = quadrantConfig[position];
        const isImage = config.type === 'image';
        let itemToShow: ContentItem | undefined = undefined;

        if (isImage) {
          if (config.contentId) {
            // Find specific image by ID from all items, then verify it's an image
            const foundItem = items.find(item => item.id === config.contentId);
            if (foundItem && foundItem.type === 'image') {
              itemToShow = foundItem;
            } else if (foundItem) {
              // console.warn(`Quadrant ${position} configured for image ID ${config.contentId}, but item is type ${foundItem.type}. Falling back.`);
            }
          }
          // Fallback to carousel logic if no valid contentId or item not found/wrong type
          if (!itemToShow && imageItems.length > 0) {
            itemToShow = imageItems[quadrantIndices[position] % imageItems.length];
          }
        } else { // type is 'iframe'
          if (config.contentId) {
            // Find specific iframe by ID from all items, then verify it's an iframe
            const foundItem = items.find(item => item.id === config.contentId);
            if (foundItem && foundItem.type === 'iframe') {
              itemToShow = foundItem;
            } else if (foundItem) {
              // console.warn(`Quadrant ${position} configured for iframe ID ${config.contentId}, but item is type ${foundItem.type}. Falling back.`);
            }
          }
           // Fallback to first available iframe if no valid contentId or item not found/wrong type
          if (!itemToShow && iframeItems.length > 0) {
            itemToShow = iframeItems[0]; 
          }
        }

        return (
          <div key={position} className={`relative flex items-center justify-center bg-black ${isImage ? '' : 'bg-gray-800'}`}>
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
