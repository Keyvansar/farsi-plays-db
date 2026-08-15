import React, { useState, useRef, useEffect } from 'react';

export default function AutocompleteSelect({
  label,
  selectedValues = [],         // Array of currently selected values
  onChange,                     // (newValuesArray) => void
  searchFn,                     // async (searchTerm) => [{ value, label }, ...]
  placeholder = 'جستجو...',
  emptyText = 'نتیجه‌ای یافت نشد',
  loadingText = 'در حال جستجو...',
  maxSelected = null,           // Optional limit
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchFn(searchTerm);
        setOptions(results || []);
        setHighlightIndex(-1);
      } catch (err) {
        console.error('Autocomplete search error:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, isOpen, searchFn]);

  // Open dropdown when focused
  const handleFocus = () => {
    setIsOpen(true);
  };

  // Toggle selection
  const toggleSelect = (optionValue) => {
    const isSelected = selectedValues.includes(optionValue);
    if (isSelected) {
      onChange(selectedValues.filter(v => v !== optionValue));
    } else {
      if (maxSelected && selectedValues.length >= maxSelected) return;
      onChange([...selectedValues, optionValue]);
    }
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // Remove a selected chip
  const removeChip = (optionValue) => {
    onChange(selectedValues.filter(v => v !== optionValue));
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && options[highlightIndex]) {
        toggleSelect(options[highlightIndex].value);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && searchTerm === '' && selectedValues.length > 0) {
      // Remove last chip on backspace with empty input
      removeChip(selectedValues[selectedValues.length - 1]);
    }
  };

  // Filter out already-selected options from dropdown (for multi-select)
  const availableOptions = options.filter(opt => !selectedValues.includes(opt.value));

  return (
    <div className="mb-4" dir="rtl">
      {label && (
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          {label}
          {selectedValues.length > 0 && (
            <span className="mr-1 text-xs text-indigo-600 font-normal">
              ({selectedValues.length})
            </span>
          )}
        </label>
      )}

      <div ref={containerRef} className="relative">
        {/* Selected Chips + Input Container */}
        <div
          className={`min-h-[44px] w-full px-3 py-2 border-2 rounded-xl bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all cursor-text ${
            isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'
          }`}
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex flex-wrap gap-1.5 items-center">
            {selectedValues.map(val => {
              const option = options.find(o => o.value === val);
              const displayLabel = option?.label || val;
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium"
                >
                  {displayLabel}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChip(val);
                    }}
                    className="text-indigo-400 hover:text-indigo-600 font-bold leading-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 outline-none"
                    aria-label={`حذف ${displayLabel}`}
                  >
                    ✕
                  </button>
                </span>
              );
            })}
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={selectedValues.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[80px] outline-none bg-transparent text-sm py-1"
              aria-label={label}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {loadingText}
              </div>
            ) : availableOptions.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {emptyText}
              </div>
            ) : (
              availableOptions.map((opt, index) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleSelect(opt.value)}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={`w-full text-right px-3 py-2 text-sm transition-colors focus:outline-none ${
                    index === highlightIndex
                      ? 'bg-indigo-50 text-indigo-900 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}