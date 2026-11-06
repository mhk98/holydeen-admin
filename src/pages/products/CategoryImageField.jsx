import { useState } from 'react';
import { imageUrl } from '../../utils/assetUrl';

export default function CategoryImageField({ label, recommended, value, onChange, previewClassName }) {
  const [fileName, setFileName] = useState('No file chosen');

  function handleFile(e) {
    const file = e.target.files[0];
    // Lets the same file be picked again after it was removed.
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result || '');
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    setFileName('No file chosen');
    onChange('');
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} <span className="text-xs font-normal text-gray-400">(Recommended: {recommended})</span>
      </label>
      <label className="flex items-center border border-gray-300 rounded overflow-hidden cursor-pointer w-full">
        <span className="bg-white border-r border-gray-300 px-3 py-2 text-xs text-gray-600 whitespace-nowrap hover:bg-gray-50 transition">
          Choose file
        </span>
        <span className="px-3 text-xs text-gray-400 flex-1">{fileName}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {value && (
        <div className="relative inline-block mt-2">
          <img src={imageUrl(value)} alt={label} className={`${previewClassName} rounded-lg border border-gray-200 object-cover`} />
          <button
            type="button"
            onClick={handleRemove}
            aria-label={`Remove ${label}`}
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs leading-none text-white hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
