import React from 'react';
import { PlayCircle } from 'lucide-react';
import { contentCategories } from './ImageUploadTab'; // Import categories

interface IframeUploadTabProps {
  iframeCode: string;
  onIframeCodeChange: (code: string) => void;
  onPreview: () => void;
  category: string;
  onCategoryChange: (category: string) => void;
  tags: string;
  onTagsChange: (tags: string) => void;
}

const IframeUploadTab: React.FC<IframeUploadTabProps> = ({
  iframeCode,
  onIframeCodeChange,
  onPreview,
  category,
  onCategoryChange,
  tags,
  onTagsChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="iframeCode" className="block text-sm font-medium text-gray-700 mb-1">
          iframe Code or Databox URL
        </label>
        <textarea
          id="iframeCode"
          value={iframeCode}
          onChange={(e) => onIframeCodeChange(e.target.value)}
          placeholder="Paste your Databox URL or the full iframe code here..."
          className="w-full p-2 border border-gray-300 rounded-md h-32 font-mono text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Only public Databox URLs/iframes are currently supported.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlayCircle className="h-4 w-4" />
            Test iframe
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="iframeCategory" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="iframeCategory"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          {contentCategories.map(cat => (
            // Disable 'vision_board' and 'monthly_goal' for iframes, as they are typically image-based
            // Allow 'kpi' as it's specified for iframes
            <option key={cat.value} value={cat.value} disabled={cat.value !== 'kpi'}>
              {cat.label}
            </option>
          ))}
        </select>
         <p className="mt-1 text-xs text-gray-500">
            'KPIs (iframe)' is the typical category for iframes.
          </p>
      </div>

      <div>
        <label htmlFor="iframeTags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags (comma-separated)
        </label>
        <input
          id="iframeTags"
          type="text"
          value={tags}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="e.g., sales, dashboard, live-data"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </div>
  );
};

export default IframeUploadTab;
