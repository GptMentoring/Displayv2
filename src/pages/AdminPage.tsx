import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import UploadForm from '../components/UploadForm';
import ContentList from '../components/ContentList';
import SlideshowSettings from '../components/SlideshowSettings';
import { supabase } from '../lib/supabase';
import { useSlideshowData } from '../lib/useSlideshowData';
import { Database } from '../lib/database.types';

type ContentItem = Database['public']['Tables']['content_items']['Row'];

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useSlideshowData();

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate('/login');
        return;
      }

      fetchContentItems();
    };

    checkAuthAndFetchData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/login');
      }
    });


    // Set up realtime subscription
    const subscription = supabase
      .channel('admin_content_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'content_items' }, 
        fetchContentItems)
      .subscribe();

    return () => {
      authListener?.subscription.unsubscribe();
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchContentItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .order('sort_order', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setContentItems(data || []);
    } catch (error) {
      console.error('Error fetching content items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorderContent = async (reorderedItems: ContentItem[]) => {
    try {
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));

      const { error } = await supabase.from('content_items').upsert(updates);

      if (error) {
        throw new Error(error.message);
      }

      // Update local state optimistically
      setContentItems(reorderedItems);
    } catch (error) {
      console.error('Error reordering content:', error);
      alert('Failed to reorder content. Please try again.');
      // Revert to previous state by refetching
      fetchContentItems();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <UploadForm onContentAdded={fetchContentItems} />
            
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Content Items</h2>
              {isLoading ? (
                <div className="text-center py-8">Loading content...</div>
              ) : (
                <ContentList
                  items={contentItems}
                  setItems={setContentItems}
                  onContentDeleted={fetchContentItems}
                  onReorder={handleReorderContent}
                />
              )}
            </div>
          </div>
          
          <div>
            <SlideshowSettings />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;