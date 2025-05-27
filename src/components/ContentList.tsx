import React from 'react';
import { Trash2, Image, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type ContentItem = Database['public']['Tables']['content_items']['Row'];

interface ContentListProps {
  items: ContentItem[];
  onContentDeleted: () => void;
}

const ContentList: React.FC<ContentListProps> = ({ items, onContentDeleted }) => {
  const [isDeleting, setIsDeleting] = React.useState<Record<string, boolean>>({});

  const handleDelete = async (item: ContentItem) => {
    if (isDeleting[item.id]) return;

    setIsDeleting(prev => ({ ...prev, [item.id]: true }));

    try {
      // If it's an image, delete from storage first
      if (item.type === 'image' && item.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('content')
          .remove([item.storage_path]);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', item.id);

      if (error) {
        throw new Error(error.message);
      }

      onContentDeleted();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(prev => ({ ...prev, [item.id]: false }));
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(item => (
        <div 
          key={item.id} 
          className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
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
                disabled={isDeleting[item.id]}
                className={`text-red-500 hover:bg-red-50 p-2 rounded-full ${
                  isDeleting[item.id] ? 'opacity-50 cursor-not-allowed' : ''
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
                <span>{new URL(item.url).pathname.split('/').pop()}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContentList;