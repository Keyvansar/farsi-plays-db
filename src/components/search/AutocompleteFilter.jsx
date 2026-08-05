import React, { useState, useEffect } from 'react';

export default function AutocompleteFilter({ label, options, selected, onChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = options.filter(opt =>
    opt.includes(searchTerm) && !selected.includes(opt)
  ).slice(0, 8);

  const handleSelect = (value) => {
    onChange([...selected, value]);
    setSearchTerm('');
  };

  const handleRemove = (value) => {
    onChange(selected.filter(s => s !== value));
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      
      {/* Selected Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(item => (
            <span key={item} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
              {item}
              <button onClick={() => handleRemove(item)} className="text-indigo-400 hover:text-indigo-600 font-bold">✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="تایپ کنید..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-0"
        />

        {/* Dropdown */}
        {isOpen && filtered.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.map(item => (
              <label key={item} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleSelect(item)}
                  className="rounded text-indigo-600"
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}