import React from 'react';

interface ImageUploadTabProps {
  onImageFileChange: (file: File | null) => void;
  imageFile: File | null;
}

const ImageUploadTab: React.FC<ImageUploadTabProps> = ({
  onImageFileChange,
  imageFile,
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

    </div>
  );
};

export default ImageUploadTab;
