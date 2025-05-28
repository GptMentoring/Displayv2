import React from 'react';
import { X } from 'lucide-react';

interface IframePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
}

const IframePreviewModal: React.FC<IframePreviewModalProps> = ({ isOpen, onClose, previewUrl }) => {
  if (!isOpen || !previewUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col max-w-screen-xl max-h-screen-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">iframe Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close preview modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 bg-gray-100 p-4 overflow-auto">
          <iframe
            src={previewUrl} // Use the prop here
            className="w-full h-full border-0 rounded-lg bg-white shadow-inner overflow-hidden"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
            referrerPolicy="origin"
            allow="fullscreen"
            title="iframe Preview" // Added title for accessibility
          />
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IframePreviewModal;
