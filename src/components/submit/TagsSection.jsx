import { useFormContext } from 'react-hook-form';

export default function TagsSection() {
  const { register, watch, setValue } = useFormContext();
  const watchedTags = watch('tags') || [];
  const watchedCustomTag = watch('custom_tag') || '';

  const addTag = () => {
    const tag = watchedCustomTag.trim();
    if (tag && !watchedTags.includes(tag)) {
      setValue('tags', [...watchedTags, tag]);
      setValue('custom_tag', '');
    }
  };

  const removeTag = (tagToRemove) => {
    setValue('tags', watchedTags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <h3 className="text-sm font-bold text-gray-700 mb-3">🏷️ برچسب‌ها</h3>

      {/* Existing Tags */}
      {watchedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {watchedTags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-indigo-400 hover:text-indigo-600 font-bold"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add New Tag */}
      <div className="flex gap-2">
        <input
          type="text"
          {...register('custom_tag')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
          placeholder="برچسب جدید (مثال: کمدی، تاریخی، تک‌گویی)"
        />
        <button
          type="button"
          onClick={addTag}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          افزودن
        </button>
      </div>
    </div>
  );
}