import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Image, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type ContentItem = Database['public']['Tables']['content_items']['Row'];

interface ContentListProps {
  items: ContentItem[];
  setItems: React.Dispatch<React.SetStateAction<ContentItem[]>>; // For optimistic update
  onContentDeleted: () => void;
  onReorder: (reorderedItems: ContentItem[]) => Promise<void>; // To handle saving to DB
}

// Individual Sortable Item Component
const SortableItem: React.FC<{ item: ContentItem; isDeleting: boolean; handleDelete: (item: ContentItem) => void }> = ({
  item,
  isDeleting,
  handleDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${
        isDragging ? 'shadow-xl' : 'hover:shadow-md'
      } transition-shadow flex items-stretch`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="p-3 bg-gray-50 hover:bg-gray-100 cursor-grab touch-none flex items-center justify-center"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5 text-gray-500" />
      </div>

      {/* Item Content */}
      <div className="flex-grow">
        <div className="aspect-video bg-gray-100 relative">
          {item.type === 'image' ? (
            <img
              src={item.url}
              alt="Content preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Globe className="h-12 w-12 text-gray-400" />
              <span className="sr-only">iframe content</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {item.type === 'image' ? (
                <Image className="h-4 w-4 text-blue-500" />
              ) : (
                <Globe className="h-4 w-4 text-green-500" />
              )}
              <span className="font-medium text-gray-700 capitalize">
                {item.type}
              </span>
            </div>
            <button
              onClick={() => handleDelete(item)}
              disabled={isDeleting}
              className={`text-red-500 hover:bg-red-50 p-2 rounded-full ${
                isDeleting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Delete item"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </button>
          </div>
          <div className="mt-2 truncate text-sm text-gray-500">
            {item.type === 'iframe' ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-blue-600"
              >
                {item.url}
              </a>
            ) : (
              <span>{item.name || new URL(item.url).pathname.split('/').pop()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ContentList: React.FC<ContentListProps> = ({ items, setItems, onContentDeleted, onReorder }) => {
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDelete = async (item: ContentItem) => {
    if (isDeleting[item.id] || isSavingOrder) return;

    // For iframes, show a confirmation dialog
    if (item.type === 'iframe') {
      const confirmDelete = window.confirm(
        'Are you sure you want to delete this iframe? This action cannot be undone.'
      );
      if (!confirmDelete) return;
    }

    setIsDeleting(prev => ({ ...prev, [item.id]: true }));
    try {
      // For images, delete from storage first
      if (item.type === 'image' && item.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('content')
          .remove([item.storage_path]);
        if (storageError) throw new Error(storageError.message);
      }

      // Delete the content item
      const { error } = await supabase.from('content_items').delete().eq('id', item.id);
      if (error) throw new Error(error.message);

      // If it's an iframe, check and update settings if this iframe was being used
      if (item.type === 'iframe') {
        const { data: settingsData } = await supabase
          .from('settings')
          .select('value')
          .eq('id', 'slideshow_settings')
          .single();

        if (settingsData?.value) {
          const settings = JSON.parse(settingsData.value);
          let needsUpdate = false;

          if (settings.quadrantIframeIds) {
            // Check both bottom quadrants
            if (settings.quadrantIframeIds.bottomLeft === item.id) {
              settings.quadrantIframeIds.bottomLeft = null;
              needsUpdate = true;
            }
            if (settings.quadrantIframeIds.bottomRight === item.id) {
              settings.quadrantIframeIds.bottomRight = null;
              needsUpdate = true;
            }
          }

          // Update settings if needed
          if (needsUpdate) {
            await supabase
              .from('settings')
              .update({ value: JSON.stringify(settings) })
              .eq('id', 'slideshow_settings');
          }
        }
      }

      onContentDeleted(); // Refresh the content list
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      
      setItems(reorderedItems); // Optimistic update
      setIsSavingOrder(true);
      try {
        await onReorder(reorderedItems);
      } catch (error) {
        setItems(items); // Revert optimistic update on error
        alert('Failed to save new order. Please try again.');
        console.error('Error saving order:', error);
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No content items yet. Add some above!</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
        {isSavingOrder && (
          <div className="fixed top-4 right-4 bg-blue-500 text-white p-3 rounded-md shadow-lg z-50">
            Saving new order...
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(item => (
            <SortableItem 
              key={item.id} 
              item={item} 
              isDeleting={isDeleting[item.id] || false} 
              handleDelete={handleDelete} 
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default ContentList;