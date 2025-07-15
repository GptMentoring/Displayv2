import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import UploadForm from '../components/UploadForm';
import ContentList from '../components/ContentList';
import SlideshowSettings from '../components/SlideshowSettings';
import { supabase } from '../lib/supabase';
import { useAdminData } from '../hooks/useAdminData'; // Import the hook

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  // Use the custom hook for content items management
  const { 
    contentItems, 
    isLoading: isLoadingContent, 
    error: contentError, 
    handleReorderContent, 
    fetchContentItems // This is the refresh/refetch function from the hook
  } = useAdminData();
  
  useEffect(() => {
    const checkAuthAndFetchPageData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate('/login');
        return;
      }
    };

    checkAuthAndFetchPageData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/login');
      }
    });

    // Realtime subscription for content_items is handled within useAdminData hook.

    return () => {
      authListener?.subscription.unsubscribe();
      // Realtime subscription cleanup for content_items is handled by the hook.
    };
  }, [navigate]); 

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
            <UploadForm onContentAdded={fetchContentItems} /> {/* Use fetchContentItems from hook to refresh list after adding */}
            
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Content Items</h2>
              {contentError && (
                <div className="text-red-500 text-center py-4">
                  Error loading content: {contentError}
                  <button 
                    onClick={() => fetchContentItems()} // Manual refresh via hook's function
                    className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              )}
              {isLoadingContent ? (
                <div className="text-center py-8">Loading content...</div>
              ) : (
                <ContentList
                  items={contentItems} // From hook
                  // setItems prop is removed as state is managed by the hook.
                  // ContentList will re-render with new items when contentItems from hook changes.
                  onContentDeleted={fetchContentItems} // Use fetchContentItems from hook to refresh list
                  onReorder={handleReorderContent} // From hook
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