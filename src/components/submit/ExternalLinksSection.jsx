import { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';

export default function ExternalLinksSection() {
  const { control } = useFormContext();
  const [newLink, setNewLink] = useState({ url: '', ref_type: 'ebook' });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'external_references',
  });

  const addExternalLink = () => {
    if (newLink.url.trim()) {
      append({ url: newLink.url, ref_type: newLink.ref_type });
      setNewLink({ url: '', ref_type: 'ebook' });
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <h3 className="text-sm font-bold text-gray-700 mb-3">🔗 لینک‌های خارجی (کتاب الکترونیک، مقاله و...)</h3>

      {/* Existing References */}
      {fields.length > 0 && (
        <div className="space-y-2 mb-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                {field.ref_type === 'ebook' ? '📖 کتاب' : field.ref_type === 'article' ? '📄 مقاله' : field.ref_type === 'review' ? '⭐ نقد' : field.ref_type === 'video' ? '🎬 ویدیو' : '🔗 لینک'}
              </span>
              <span className="flex-1 text-sm text-gray-700 truncate" dir="ltr">{field.url}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-red-500 hover:text-red-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Reference */}
      <div className="flex gap-2">
        <select
          value={newLink.ref_type}
          onChange={(e) => setNewLink({ ...newLink, ref_type: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="ebook">📖 کتاب الکترونیک</option>
          <option value="article">📄 مقاله</option>
          <option value="review">⭐ نقد و بررسی</option>
          <option value="video">🎬 ویدیو</option>
          <option value="other">🔗 سایر</option>
        </select>
        <input
          type="url"
          value={newLink.url}
          onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
          placeholder="https://example.com"
          dir="ltr"
 pattern="https?://.*"
  title="لینک باید با http:// یا https:// شروع شود"
        />
        <button
          type="button"
          onClick={addExternalLink}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          افزودن
        </button>
      </div>
    </div>
  );
}