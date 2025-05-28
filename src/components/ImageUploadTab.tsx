import React from 'react';

export const contentCategories = [
  { value: 'vision_board', label: 'Vision Board' },
  { value: 'kpi', label: 'KPIs (iframe)' },
  { value: 'monthly_goal', label: 'Monatsziele' },
];

interface ImageUploadTabProps {
  onImageFileChange: (file: File | null) => void;
  imageFile: File | null;
  category: string;
  onCategoryChange: (category: string) => void;
  tags: string;
  onTagsChange: (tags: string) => void;
  // contentCategories is defined above, could be passed as prop if needed elsewhere
}

const ImageUploadTab: React.FC<ImageUploadTabProps> = ({
  onImageFileChange,
  imageFile,
  category,
  onCategoryChange,
  tags,
  onTagsChange,
}) => {

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageFileChange(e.target.files[0]);
    } else {
      onImageFileChange(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700 mb-1">
          Image File
        </label>
        <input
          id="imageFile"
          type="file"
          accept=".png,.jpg,.jpeg,.gif"
          onChange={handleFileChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
        {imageFile && (
          <div className="mt-2 text-sm text-gray-600">
            Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(2)} KB)
          </div>
        )}
      </div>

      <div>
        <label htmlFor="imageCategory" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="imageCategory"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          {contentCategories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="imageTags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags (comma-separated)
        </label>
        <input
          id="imageTags"
          type="text"
          value={tags}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="e.g., marketing, Q3, urgent"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </div>
  );
};

export default ImageUploadTab;
