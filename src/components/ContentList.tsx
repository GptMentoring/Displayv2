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
  onContentDeleted: () => void;
  onReorder: (reorderedItems: ContentItem[]) => Promise<void>;
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
      <div
        {...attributes}
        {...listeners}
        className="p-3 bg-gray-50 hover:bg-gray-100 cursor-grab touch-none flex items-center justify-center"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5 text-gray-500" />
      </div>

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
              <span className="truncate">{item.name || new URL(item.url).pathname.split('/').pop()}</span>
            )}
          </div>

          {/* Display Category */}
          {item.category && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Category: </span>
              <span className="text-xs text-gray-700 capitalize">
                {item.category.replace('_', ' ')} 
              </span>
            </div>
          )}

          {/* Display Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="mt-1 pt-1 border-t border-gray-100 flex flex-wrap gap-1">
              {item.tags.map(tag => (
                <span 
                  key={tag} 
                  className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ContentList: React.FC<ContentListProps> = ({ items, onContentDeleted, onReorder }) => {
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

    setIsDeleting(prev => ({ ...prev, [item.id]: true }));
    try {
      if (item.type === 'image' && item.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('content')
          .remove([item.storage_path]);
        if (storageError) console.error('Error deleting from storage:', storageError);
      }
      const { error } = await supabase.from('content_items').delete().eq('id', item.id);
      if (error) throw new Error(error.message);
      onContentDeleted();
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
      
      setIsSavingOrder(true);
      try {
        await onReorder(reorderedItems);
      } catch (error) {
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