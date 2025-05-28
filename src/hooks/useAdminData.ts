import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type ContentItem = Database['public']['Tables']['content_items']['Row'];

export const useAdminData = () => {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContentItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('content_items')
        .select('*') // This will include category and tags as they are part of the table
        .order('sort_order', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setContentItems(data || []);
    } catch (err: any) {
      console.error('Error fetching content items:', err);
      setError(err.message || 'Failed to fetch content items.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContentItems();

    const subscription = supabase
      .channel('admin_content_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_items' },
        (payload) => {
          // console.log('Change received!', payload);
          fetchContentItems(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchContentItems]);

  const handleReorderContent = useCallback(
    async (reorderedItems: ContentItem[]) => {
      const originalItems = [...contentItems]; // Preserve original items for revert
      setContentItems(reorderedItems); // Optimistic update

      try {
        const updates = reorderedItems.map((item, index) => ({
          id: item.id,
          sort_order: index,
        }));

        const { error: upsertError } = await supabase.from('content_items').upsert(updates);

        if (upsertError) {
          throw upsertError;
        }
        // Data is already optimistically updated. If successful, Supabase real-time should also send an update,
        // which will trigger fetchContentItems, ensuring consistency.
        // Alternatively, can call fetchContentItems() here if more explicit control is needed post-successful reorder.
      } catch (err: any) {
        console.error('Error reordering content:', err);
        setError(err.message || 'Failed to reorder content.');
        setContentItems(originalItems); // Revert to original items on error
        // Optionally, could call fetchContentItems() here to ensure server state is reflected.
      }
    },
    [contentItems, fetchContentItems] // contentItems is needed for optimistic update revert
  );

  return { contentItems, isLoading, error, handleReorderContent, fetchContentItems };
};
