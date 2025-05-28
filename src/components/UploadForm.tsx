import React, { useState, useEffect } from 'react';
import { Upload, Link2, X } from 'lucide-react'; // Removed PlayCircle as it's in IframeUploadTab
import { supabase } from '../lib/supabase';
import * as DOMPurify from 'isomorphic-dompurify';
import ImageUploadTab, { contentCategories } from './ImageUploadTab'; // Import categories as well
import IframeUploadTab from './IframeUploadTab';
import IframePreviewModal from './IframePreviewModal'; 

interface UploadFormProps {
  onContentAdded: () => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ onContentAdded }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'iframe'>('image');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [iframeCode, setIframeCode] = useState('');
  
  // State for new fields
  const [category, setCategory] = useState<string>(contentCategories[0].value); // Default to first category
  const [tags, setTags] = useState<string>(''); // Comma-separated string

  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset category to default when tab changes
  useEffect(() => {
    if (activeTab === 'iframe') {
      setCategory('kpi'); // Default 'kpi' for iframes
    } else {
      setCategory(contentCategories[0].value); // Default to first category for images
    }
    setTags(''); // Reset tags when tab changes
    setError(null); // Clear errors
  }, [activeTab]);
  // handleIframeCodeChange is effectively replaced by passing setIframeCode to IframeUploadTab

  const handlePreview = () => { // This function remains as it's called by IframeUploadTab
    if (!iframeCode) {
      setError('Please enter the iframe code first');
      return;
    }

    try {
      const iframeSrc = extractIframeSrc(iframeCode);
      if (!iframeSrc) {
        throw new Error('No valid iframe URL found in the code');
      }
      
      if (!validateDataboxUrl(iframeSrc)) {
        throw new Error('Only Databox iframe URLs are allowed');
      }

      setPreviewUrl(iframeSrc);
      setIsPreviewOpen(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid iframe code');
    }
  };

  const extractIframeSrc = (html: string): string | null => {
    let src = null;
    
    // Handle direct Databox URLs
    if (html.trim().startsWith('https://')) {
      src = html;
    } 
    else {
      const div = document.createElement('div');
      div.innerHTML = DOMPurify.sanitize(html);
      const iframe = div.querySelector('iframe');
      src = iframe?.getAttribute('src') || null;
      
      if (!src && html.includes('src="')) {
        const match = html.match(/src="([^"]+)"/);
        src = match ? match[1] : null;
      }
    }
    
    if (src) {
      try {
        const url = new URL(src);
        url.protocol = 'https:';
        return url.toString();
      } catch (e) {
        return null;
      }
    }
    
    return src;
  };

  const validateDataboxUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'app.databox.com' || urlObj.hostname === 'databox.com';
    } catch {
      return false;
    }
  };

  const uploadImage = async () => {
    if (!imageFile) {
      setError('Please select an image to upload');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(imageFile.type)) {
      setError('Only PNG, JPEG, and GIF images are allowed');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Upload file to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(filePath, imageFile);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('content')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      // 3. Save to content_items table
      const parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      const { error: insertError } = await supabase
        .from('content_items')
        .insert({
          type: 'image',
          url: publicUrlData.publicUrl,
          storage_path: filePath,
          category: category, // Add category
          tags: parsedTags,   // Add parsed tags
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Success
      setImageFile(null);
      setCategory(contentCategories[0].value); // Reset category
      setTags(''); // Reset tags
      onContentAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while uploading');
    } finally {
      setIsUploading(false);
    }
  };

  const addIframeUrl = async () => {
    if (!iframeCode) {
      setError('Please enter the iframe code');
      return;
    }

    try {
      const iframeSrc = extractIframeSrc(iframeCode);
      if (!iframeSrc) {
        throw new Error('No valid iframe URL found in the code');
      }
      
      // Validate Databox URL
      if (!validateDataboxUrl(iframeSrc)) {
        throw new Error('Only Databox iframe URLs are allowed');
      }

      const { error } = await supabase
        .from('content_items')
        .insert({
          type: 'iframe',
          url: iframeSrc,
          storage_path: null,
          category: category, // Add category
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag), // Add parsed tags
        });

      if (error) {
        throw new Error(error.message);
      }

      // Success
      setIframeCode('');
      setCategory('kpi'); // Reset category to KPI for iframe tab default
      setTags(''); // Reset tags
      onContentAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while adding the iframe');
      return;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'image') {
      uploadImage();
    } else {
      addIframeUrl();
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Content</h2>
      
      {/* Tab Selector */}
      <div className="flex border-b mb-4">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'image'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('image')}
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Upload Image</span>
          </div>
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'iframe'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('iframe')}
        >
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span>Add iframe URL</span>
          </div>
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {activeTab === 'image' ? (
          <ImageUploadTab
            imageFile={imageFile}
            onImageFileChange={(file) => {
              setImageFile(file);
              setError(null); 
            }}
            category={category}
            onCategoryChange={setCategory}
            tags={tags}
            onTagsChange={setTags}
          />
        ) : (
          <IframeUploadTab
            iframeCode={iframeCode}
            onIframeCodeChange={(code) => {
              setIframeCode(code);
              setError(null); 
            }}
            onPreview={handlePreview}
            category={category}
            onCategoryChange={setCategory}
            tags={tags}
            onTagsChange={setTags}
          />
        )}

        {error && (
          <div className="text-red-500 text-sm p-2 bg-red-50 rounded-md mt-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading || (activeTab === 'image' && !imageFile) || (activeTab === 'iframe' && !iframeCode.trim())}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors ${
            (isUploading || (activeTab === 'image' && !imageFile) || (activeTab === 'iframe' && !iframeCode.trim())) 
            ? 'opacity-70 cursor-not-allowed' 
            : ''
          }`}
        >
          {isUploading
            ? 'Processing...'
            : activeTab === 'image'
            ? 'Upload Image'
            : 'Add iframe URL'}
        </button>
      </form>
      
      <IframePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewUrl={previewUrl}
      />
    </div>
  );
};

export default UploadForm;