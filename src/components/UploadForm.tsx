import React, { useState } from 'react';
import { Upload, Link2, PlayCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as DOMPurify from 'isomorphic-dompurify';

interface UploadFormProps {
  onContentAdded: () => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ onContentAdded }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'iframe'>('image');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [iframeCode, setIframeCode] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = () => {
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleIframeCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIframeCode(e.target.value);
    setError(null);
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
      const { error: insertError } = await supabase
        .from('content_items')
        .insert({
          type: 'image',
          url: publicUrlData.publicUrl,
          storage_path: filePath,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Success
      setImageFile(null);
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
        });

      if (error) {
        throw new Error(error.message);
      }

      // Success
      setIframeCode('');
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image File
            </label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.gif"
              onChange={handleImageChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            {imageFile && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {imageFile.name}
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              iframe Code
            </label>
            <textarea
              value={iframeCode}
              onChange={handleIframeCodeChange}
              placeholder="Paste your Databox URL or iframe code here..."
              className="w-full p-2 border border-gray-300 rounded-md h-32 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter a Databox URL or paste the complete iframe code
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handlePreview}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                <PlayCircle className="h-4 w-4" />
                Test iframe
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm p-2 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors ${
            isUploading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isUploading
            ? 'Processing...'
            : activeTab === 'image'
            ? 'Upload Image'
            : 'Add iframe URL'}
        </button>
      </form>
      
      {/* Preview Modal */}
      {isPreviewOpen && previewUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">iframe Preview</h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 bg-gray-100 p-4">
              <iframe
                src={previewUrl}
                className="w-full h-full border-0 rounded-lg bg-white shadow-inner overflow-hidden"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                referrerPolicy="origin"
                allow="fullscreen"
              />
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadForm;