import React, { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';

export default function TagsSection({ lockedFields = {} }) {
  const { control, register, getValues } = useFormContext();
  const [inputValue, setInputValue] = useState('');

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tags',
  });

  const isLocked = lockedFields.tags;

  // Get current tag values directly from form state (more reliable than useWatch)
  const getCurrentTags = () => {
    const tags = getValues('tags');
    if (!Array.isArray(tags)) return [];
    return tags;
  };

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    const currentTags = getCurrentTags();
    if (trimmed && !currentTags.some(t => t === trimmed)) {
      append(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  // Get display value - use getValues which is always up-to-date
  const getDisplayValue = (index) => {
    const tags = getCurrentTags();
    if (tags[index] && typeof tags[index] === 'string') {
      return tags[index];
    }
    
    // Fallback: if the field object has character indices, reconstruct
    const field = fields[index];
    if (field && typeof field === 'object') {
      const chars = [];
      let i = 0;
      while (field[i] !== undefined) {
        chars.push(field[i]);
        i++;
      }
      if (chars.length > 0) {
        return chars.join('');
      }
    }
    
    return null;
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-1.5">
        برچسب‌ها
        {isLocked && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
      </label>

      {/* Existing Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        {fields.map((field, index) => {
          const displayValue = getDisplayValue(index);
          
          if (!displayValue) {
            return null;
          }
          
          return (
            <span
              key={field.id}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                isLocked
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              <input type="hidden" {...register(`tags.${index}`)} />
              {displayValue}
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-indigo-400 hover:text-indigo-600 font-bold focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 outline-none"
                  aria-label={`حذف برچسب ${displayValue}`}
                >
                  ✕
                </button>
              )}
            </span>
          );
        })}
      </div>

      {/* Add New Tag Input */}
      {!isLocked && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="برچسب جدید تایپ کنید و Enter بزنید..."
            className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-0"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            افزودن
          </button>
        </div>
      )}
    </div>
  );
}