// ===== IMPORTS & DEPENDENCIES =====
import React, { useState, useEffect, useMemo } from 'react';
import { useArchiveSearch } from '../hooks/useArchiveSearch';
import { joinNamesFromArray } from '../utils/textUtils';
import { supabase } from '../lib/supabase';

const STATUS_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'verified', label: 'تأیید شده' },
  { value: 'unverified', label: 'تأیید نشده' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'oldest', label: 'قدیمی‌ترین' },
  { value: 'title_asc', label: 'عنوان (الف-ی)' },
  { value: 'title_desc', label: 'عنوان (ی-الف)' },
  { value: 'year_desc', label: 'سال انتشار (نزولی)' },
  { value: 'year_asc', label: 'سال انتشار (صعودی)' },
];

const TRANSLATION_STATUS_OPTIONS = [
  { value: '', label: 'همه' },
  { value: 'original', label: 'تألیفی' },
  { value: 'translated', label: 'ترجمه' },
];

const FIELD_CONFIG = {
  title_fa: { label: 'عنوان فارسی', type: 'text' },
  playwright_fa: { label: 'نویسنده', type: 'array' },
  translator_fa: { label: 'مترجم', type: 'array' },
  publisher: { label: 'ناشر', type: 'text' },
  publication_year_solar: { label: 'سال انتشار شمسی', type: 'number' },
  page_count: { label: 'تعداد صفحات', type: 'number' },
  isbn: { label: 'شابک (ISBN)', type: 'text' },
  synopsis: { label: 'خلاصه داستان', type: 'textarea' },
  cast_total: { label: 'تعداد کل بازیگران', type: 'number' },
  cast_men: { label: 'بازیگران مرد', type: 'number' },
  cast_women: { label: 'بازیگران زن', type: 'number' },
  cast_nonspecific: { label: 'بازیگران غیراختصاصی', type: 'number' },
  source_language: { label: 'زبان مبدأ', type: 'text' },
  original_title: { label: 'عنوان اصلی', type: 'text' },
  is_verified: { label: 'وضعیت تأیید', type: 'boolean' },
};

const FLAG_REASONS = [
  { id: 'wrong_title', label: 'عنوان نادرست است' },
  { id: 'wrong_author', label: 'نویسنده نادرست است' },
  { id: 'wrong_translator', label: 'مترجم نادرست است' },
  { id: 'wrong_publisher', label: 'ناشر نادرست است' },
  { id: 'wrong_year', label: 'سال انتشار نادرست است' },
  { id: 'wrong_pages', label: 'تعداد صفحات نادرست است' },
  { id: 'wrong_isbn', label: 'شابک نادرست است' },
  { id: 'wrong_synopsis', label: 'خلاصه نادرست است' },
  { id: 'wrong_cast', label: 'اطلاعات بازیگران نادرست است' },
  { id: 'duplicate', label: 'این رکورد تکراری است' },
  { id: 'other', label: 'سایر' },
];

function FilterBadge({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-indigo-900 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function SuggestEditModal({ isOpen, onClose, item, user, isDirectEdit }) {
  const [editType, setEditType] = useState('correction');
  const [field, setField] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [suggestedValue, setSuggestedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFlags, setSelectedFlags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen) {
      setEditType(isDirectEdit ? 'direct_edit' : 'correction');
      setField('');
      setCurrentValue('');
      setSuggestedValue('');
      setNotes('');
      setSelectedFlags([]);
      setMessage({ type: '', text: '' });
    }
  }, [isOpen, isDirectEdit]);

  const getCurrentFieldValue = (fieldName) => {
    if (!item || !fieldName) return '';
    
    // Handle nested fields from works table
    if (fieldName.includes('.')) {
      const [parent, child] = fieldName.split('.');
      const parentObj = item[parent];
      if (parentObj && child in parentObj) {
        const val = parentObj[child];
        return Array.isArray(val) ? joinNamesFromArray(val) : String(val ?? '');
      }
      return '';
    }
    
    const val = item[fieldName];
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) return joinNamesFromArray(val);
    if (typeof val === 'boolean') return val ? 'بله' : 'خیر';
    return String(val);
  };

  const handleFieldChange = (newField) => {
    setField(newField);
    if (newField && editType !== 'addition') {
      const val = getCurrentFieldValue(newField);
      setCurrentValue(val);
    } else {
      setCurrentValue('');
    }
    setSuggestedValue('');
  };

  const toggleFlag = (flagId) => {
    setSelectedFlags(prev => 
      prev.includes(flagId) 
        ? prev.filter(f => f !== flagId)
        : [...prev, flagId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setMessage({ type: 'error', text: 'ارتباط با پایگاه داده برقرار نیست.' });
      return;
    }
    
    if (editType === 'flag' && selectedFlags.length === 0) {
      setMessage({ type: 'error', text: 'لطفاً حداقل یک مورد خطا را انتخاب کنید.' });
      return;
    }
    
    setSubmitting(true);
    
    let payloadData = {
      edition_id: item.id,
      edit_type: editType,
      field_name: field,
      current_value: currentValue,
      suggested_value: suggestedValue,
      notes: notes || null,
      submitter_name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'ناشناس',
      submitter_email: user?.email || null,
    };

    if (editType === 'flag') {
      payloadData = {
        ...payloadData,
        flag_reasons: selectedFlags,
        flagged_fields: selectedFlags.map(id => {
          const fieldMap = {
            wrong_title: 'title_fa',
            wrong_author: 'playwright_fa',
            wrong_translator: 'translator_fa',
            wrong_publisher: 'publisher',
            wrong_year: 'publication_year_solar',
            wrong_pages: 'page_count',
            wrong_isbn: 'isbn',
            wrong_synopsis: 'synopsis',
            wrong_cast: 'cast_total',
          };
          return fieldMap[id] || 'other';
        }),
        flagged_values: selectedFlags.reduce((acc, id) => {
          const fieldMap = {
            wrong_title: 'title_fa',
            wrong_author: 'playwright_fa',
            wrong_translator: 'translator_fa',
            wrong_publisher: 'publisher',
            wrong_year: 'publication_year_solar',
            wrong_pages: 'page_count',
            wrong_isbn: 'isbn',
            wrong_synopsis: 'synopsis',
            wrong_cast: 'cast_total',
          };
          const fieldName = fieldMap[id];
          if (fieldName) {
            acc[fieldName] = getCurrentFieldValue(fieldName);
          }
          return acc;
        }, {}),
      };
    }

    try {
      const { error } = await supabase.from('pending_submissions').insert({ 
        payload: { type: editType === 'direct_edit' ? 'direct_edit' : 'edit_suggestion', ...payloadData } 
      });
      if (error) throw error;
      setMessage({ type: 'success', text: isDirectEdit ? '✅ درخواست ویرایش ثبت شد.' : '✅ پیشنهاد شما ثبت شد و پس از بررسی اعمال خواهد شد.' });
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Error submitting edit:', err);
      setMessage({ type: 'error', text: 'خطایی در ثبت درخواست رخ داد. لطفاً دوباره تلاش کنید.' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderInputForField = (value, onChange, placeholder, fieldType, fieldName) => {
    const config = FIELD_CONFIG[fieldName];
    const type = fieldType || config?.type || 'text';
    
    if (type === 'textarea' || fieldName === 'synopsis') {
      return (
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder} 
          rows={4} 
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base resize-none" 
        />
      );
    }
    
    if (type === 'number') {
      return (
        <input 
          type="number" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder} 
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base" 
        />
      );
    }
    
    return (
      <input 
        type="text" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder} 
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base" 
      />
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">{isDirectEdit ? 'ویرایش اثر' : 'پیشنهاد ویرایش'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">اثر: <span className="font-semibold text-indigo-700">{item.title_fa}</span></p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {message.text && (
            <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{message.text}</div>
          )}
          
          {!isDirectEdit && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">نوع درخواست</label>
              <div className="flex gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="editType" value="correction" checked={editType === 'correction'} onChange={e => setEditType(e.target.value)} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">اصلاح اطلاعات</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="editType" value="addition" checked={editType === 'addition'} onChange={e => setEditType(e.target.value)} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">افزودن اطلاعات جدید</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="editType" value="flag" checked={editType === 'flag'} onChange={e => setEditType(e.target.value)} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">گزارش خطا</span>
                </label>
              </div>
            </div>
          )}

          {editType === 'flag' ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">موارد خطا را انتخاب کنید:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FLAG_REASONS.map(reason => (
                  <label key={reason.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedFlags.includes(reason.id)} 
                      onChange={() => toggleFlag(reason.id)} 
                      className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" 
                    />
                    <span className="text-sm text-gray-700">{reason.label}</span>
                  </label>
                ))}
              </div>
              {selectedFlags.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">مقادیر فعلی این فیلدها:</p>
                  <div className="space-y-2 text-xs text-gray-700">
                    {selectedFlags.map(id => {
                      const fieldMap = {
                        wrong_title: 'title_fa',
                        wrong_author: 'playwright_fa',
                        wrong_translator: 'translator_fa',
                        wrong_publisher: 'publisher',
                        wrong_year: 'publication_year_solar',
                        wrong_pages: 'page_count',
                        wrong_isbn: 'isbn',
                        wrong_synopsis: 'synopsis',
                        wrong_cast: 'cast_total',
                      };
                      const fieldName = fieldMap[id];
                      if (!fieldName) return null;
                      return (
                        <div key={id} className="flex justify-between">
                          <span className="font-medium">{FIELD_CONFIG[fieldName]?.label || fieldName}:</span>
                          <span className="font-mono bg-white px-2 py-1 rounded">{getCurrentFieldValue(fieldName)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">فیلد مورد نظر</label>
                <select value={field} onChange={e => handleFieldChange(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base">
                  <option value="">انتخاب فیلد...</option>
                  {Object.entries(FIELD_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {field && editType !== 'addition' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مقدار فعلی</label>
                  {renderInputForField(currentValue, setCurrentValue, '', FIELD_CONFIG[field]?.type, field)}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{editType === 'flag' ? 'توضیح خطا' : 'مقدار پیشنهادی'}</label>
                {field ? (
                  renderInputForField(suggestedValue, setSuggestedValue, editType === 'flag' ? 'توضیح دهید چه خطایی وجود دارد...' : 'مقدار صحیح را وارد کنید...', FIELD_CONFIG[field]?.type, field)
                ) : (
                  <textarea 
                    value={suggestedValue} 
                    onChange={e => setSuggestedValue(e.target.value)} 
                    placeholder={editType === 'flag' ? 'توضیح دهید چه خطایی وجود دارد...' : 'مقدار صحیح را وارد کنید...'} 
                    rows={3} 
                    required 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base resize-none" 
                  />
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">یادداشت اضافی (اختیاری)</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="توضیحات تکمیلی، منبع اطلاعات، یا هر نکته دیگری..." 
              rows={2} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base resize-none" 
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">انصراف</button>
            <button type="submit" disabled={submitting} className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition-colors disabled:opacity-50">
              {submitting ? 'در حال ثبت...' : (isDirectEdit ? 'ثبت ویرایش' : 'ثبت پیشنهاد')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditionCard({ item, user }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const allFields = useMemo(() => {
    const fields = [];
    
    // Basic info
    if (item.title_fa) fields.push({ label: 'عنوان فارسی', value: item.title_fa, category: 'اطلاعات پایه' });
    if (item.works?.original_title) fields.push({ label: 'عنوان اصلی', value: `${item.works.original_title} (${item.works.source_language?.toUpperCase() || 'UNKNOWN'})`, category: 'اطلاعات پایه' });
    if (item.works?.playwright_fa && item.works.playwright_fa.length > 0) fields.push({ label: 'نویسنده', value: joinNamesFromArray(item.works.playwright_fa), category: 'اطلاعات پایه' });
    if (item.translator_fa && item.translator_fa.length > 0) fields.push({ label: 'مترجم', value: joinNamesFromArray(item.translator_fa), category: 'اطلاعات پایه' });
    if (item.publisher) fields.push({ label: 'ناشر', value: item.publisher, category: 'اطلاعات پایه' });
    if (item.publication_year_solar) fields.push({ label: 'سال انتشار شمسی', value: item.publication_year_solar.toString(), category: 'اطلاعات پایه' });
    if (item.isbn) fields.push({ label: 'شابک (ISBN)', value: item.isbn, category: 'اطلاعات پایه' });
    if (item.page_count) fields.push({ label: 'تعداد صفحات', value: item.page_count.toString(), category: 'اطلاعات پایه' });
    
    // Cast info
    if (item.cast_total !== null && item.cast_total !== -1) fields.push({ label: 'تعداد کل بازیگران', value: item.cast_total.toString(), category: 'بازیگران' });
    if (item.cast_men !== null) fields.push({ label: 'بازیگران مرد', value: item.cast_men.toString(), category: 'بازیگران' });
    if (item.cast_women !== null) fields.push({ label: 'بازیگران زن', value: item.cast_women.toString(), category: 'بازیگران' });
    if (item.cast_nonspecific !== null) fields.push({ label: 'بازیگران غیراختصاصی', value: item.cast_nonspecific.toString(), category: 'بازیگران' });
    
    // Other
    if (item.synopsis) fields.push({ label: 'خلاصه داستان', value: item.synopsis, category: 'سایر' });
    if (item.source_language && item.source_language !== 'fa') fields.push({ label: 'زبان مبدأ', value: item.source_language.toUpperCase(), category: 'اطلاعات پایه' });
    
    // Group by category
    const grouped = {};
    fields.forEach(f => {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category].push(f);
    });
    
    return grouped;
  }, [item]);

  const isDirectEdit = !!user;

  return (
    <>
      <div className="interactive-card p-5 rounded-lg border border-gray-200 hover:border-indigo-300 bg-white transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-indigo-900">{item.title_fa}</h3>
            {item.works?.original_title && (<p className="text-xs text-gray-500 font-mono mt-1" dir="ltr">Original: {item.works.original_title} ({item.works.source_language?.toUpperCase()})</p>)}
          </div>
          <div className="flex items-center gap-2 self-start flex-wrap">
            {item.is_verified ? (<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ تأیید شده</span>) : (<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">تأیید نشده</span>)}
            {item.publication_year_solar && (<span className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium">{item.publication_year_solar}</span>)}
          </div>
        </div>
        
        {/* Compact view */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600 my-4">
          <div className="bg-gray-50 px-3 py-2 rounded-lg">
            <span className="font-semibold text-gray-700 block text-xs mb-1">نویسنده:</span>
            <span className="text-gray-900">{joinNamesFromArray(item.works?.playwright_fa) || 'نامشخص'}</span>
          </div>
          {item.translator_fa && item.translator_fa.length > 0 && (
            <div className="bg-gray-50 px-3 py-2 rounded-lg">
              <span className="font-semibold text-gray-700 block text-xs mb-1">مترجم:</span>
              <span className="text-gray-900">{joinNamesFromArray(item.translator_fa)}</span>
            </div>
          )}
          {item.publisher && (
            <div className="bg-gray-50 px-3 py-2 rounded-lg">
              <span className="font-semibold text-gray-700 block text-xs mb-1">ناشر:</span>
              <span className="text-gray-900">{item.publisher}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 my-3 pt-3 border-t border-gray-100">
          {item.page_count && (<span className="bg-gray-100 px-2 py-1 rounded">📄 {item.page_count} صفحه</span>)}
          {item.isbn && (<span className="bg-gray-100 px-2 py-1 rounded font-mono">ISBN: {item.isbn}</span>)}
          {item.cast_total !== null && item.cast_total !== -1 && (<span className="bg-gray-100 px-2 py-1 rounded">🎭 {item.cast_total} بازیگر</span>)}
          {item.cast_men !== null && (<span className="bg-gray-100 px-2 py-1 rounded">♂️ {item.cast_men}</span>)}
          {item.cast_women !== null && (<span className="bg-gray-100 px-2 py-1 rounded">♀️ {item.cast_women}</span>)}
          {item.cast_nonspecific !== null && (<span className="bg-gray-100 px-2 py-1 rounded">⚧️ {item.cast_nonspecific}</span>)}
        </div>
        
        {item.synopsis && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-gray-700 leading-relaxed"><span className="font-semibold text-indigo-700 block mb-2">خلاصه:</span>{item.synopsis}</p>
          </div>
        )}
        
        {/* Expandable detailed view */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors inline-flex items-center gap-2"
          >
            <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? 'نمایش کمتر' : 'نمایش همه اطلاعات'}
          </button>
          
          {isExpanded && (
            <div className="mt-4 space-y-4 animate-fadeIn">
              {Object.entries(allFields).map(([category, fields]) => (
                <div key={category}>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1">{category}</h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map((field, idx) => (
                      <div key={idx} className="bg-gray-50 px-3 py-2 rounded-lg">
                        <dt className="text-xs font-semibold text-gray-500 mb-1">{field.label}</dt>
                        <dd className="text-sm text-gray-900">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <button onClick={() => setShowEditModal(true)} className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDirectEdit ? 'text-green-600 hover:text-green-800' : 'text-indigo-600 hover:text-indigo-800'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            {isDirectEdit ? 'ویرایش' : 'پیشنهاد ویرایش / افزودن اطلاعات'}
          </button>
        </div>
      </div>
      <SuggestEditModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} item={item} user={user} isDirectEdit={isDirectEdit} />
    </>
  );
}

export default function SearchView({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { results, loading, error, hasSearched, executeSearch } = useArchiveSearch();
  const [statusFilter, setStatusFilter] = useState('');
  const [translationFilter, setTranslationFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [yearRange, setYearRange] = useState({ min: '', max: '' });
  const [hasTranslator, setHasTranslator] = useState(false);
  const [hasSynopsis, setHasSynopsis] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const processedResults = useMemo(() => {
    let filtered = [...results];
    if (statusFilter === 'verified') filtered = filtered.filter(item => item.is_verified);
    else if (statusFilter === 'unverified') filtered = filtered.filter(item => !item.is_verified);
    if (translationFilter === 'original') filtered = filtered.filter(item => item.source_language === 'fa');
    else if (translationFilter === 'translated') filtered = filtered.filter(item => item.source_language !== 'fa');
    if (hasTranslator) filtered = filtered.filter(item => item.translator_fa && item.translator_fa.length > 0);
    if (hasSynopsis) filtered = filtered.filter(item => item.synopsis && item.synopsis.trim());
    if (yearRange.min) filtered = filtered.filter(item => item.publication_year_solar >= parseInt(yearRange.min));
    if (yearRange.max) filtered = filtered.filter(item => item.publication_year_solar <= parseInt(yearRange.max));
    switch (sortBy) {
      case 'newest': filtered.sort((a, b) => (b.publication_year_solar || 0) - (a.publication_year_solar || 0)); break;
      case 'oldest': filtered.sort((a, b) => (a.publication_year_solar || 0) - (b.publication_year_solar || 0)); break;
      case 'title_asc': filtered.sort((a, b) => a.title_fa.localeCompare(b.title_fa, 'fa')); break;
      case 'title_desc': filtered.sort((a, b) => b.title_fa.localeCompare(a.title_fa, 'fa')); break;
      case 'year_desc': filtered.sort((a, b) => (b.publication_year_solar || 0) - (a.publication_year_solar || 0)); break;
      case 'year_asc': filtered.sort((a, b) => (a.publication_year_solar || 0) - (b.publication_year_solar || 0)); break;
      default: break;
    }
    return filtered;
  }, [results, statusFilter, translationFilter, sortBy, yearRange, hasTranslator, hasSynopsis]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (translationFilter) count++;
    if (yearRange.min) count++;
    if (yearRange.max) count++;
    if (hasTranslator) count++;
    if (hasSynopsis) count++;
    return count;
  }, [statusFilter, translationFilter, yearRange, hasTranslator, hasSynopsis]);

  const clearAllFilters = () => {
    setStatusFilter('');
    setTranslationFilter('');
    setYearRange({ min: '', max: '' });
    setHasTranslator(false);
    setHasSynopsis(false);
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    executeSearch(searchTerm);
  };

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-3">
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو بر اساس نام اثر، نویسنده یا مترجم..." className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base" />
            <button type="submit" disabled={loading} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition duration-150 disabled:opacity-50">{loading ? 'در حال جستجو...' : 'جستجو'}</button>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="relative px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              {activeFiltersCount > 0 && (<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{activeFiltersCount}</span>)}
            </button>
          </div>
        </form>
        {showFilters && (
          <div className="border-t pt-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">فیلترهای پیشرفته</h3>
              {activeFiltersCount > 0 && (<button onClick={clearAllFilters} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">حذف همه فیلترها</button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">وضعیت تأیید</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                  {STATUS_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نوع اثر</label>
                <select value={translationFilter} onChange={(e) => setTranslationFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                  {TRANSLATION_STATUS_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">مرتب‌سازی</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                  {SORT_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">محدوده سال انتشار</label>
                <div className="flex gap-3">
                  <input type="number" value={yearRange.min} onChange={(e) => setYearRange(prev => ({ ...prev, min: e.target.value }))} placeholder="از سال" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                  <span className="self-center text-gray-400">تا</span>
                  <input type="number" value={yearRange.max} onChange={(e) => setYearRange(prev => ({ ...prev, max: e.target.value }))} placeholder="تا سال" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={hasTranslator} onChange={(e) => setHasTranslator(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">دارای مترجم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={hasSynopsis} onChange={(e) => setHasSynopsis(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">دارای خلاصه</span>
                </label>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                {statusFilter && (<FilterBadge label={STATUS_OPTIONS.find(o => o.value === statusFilter)?.label} onRemove={() => setStatusFilter('')} />)}
                {translationFilter && (<FilterBadge label={TRANSLATION_STATUS_OPTIONS.find(o => o.value === translationFilter)?.label} onRemove={() => setTranslationFilter('')} />)}
                {yearRange.min && (<FilterBadge label={`از سال ${yearRange.min}`} onRemove={() => setYearRange(prev => ({ ...prev, min: '' }))} />)}
                {yearRange.max && (<FilterBadge label={`تا سال ${yearRange.max}`} onRemove={() => setYearRange(prev => ({ ...prev, max: '' }))} />)}
                {hasTranslator && (<FilterBadge label="دارای مترجم" onRemove={() => setHasTranslator(false)} />)}
                {hasSynopsis && (<FilterBadge label="دارای خلاصه" onRemove={() => setHasSynopsis(false)} />)}
              </div>
            )}
          </div>
        )}
      </div>
      {error && (<div className="p-4 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 animate-fadeIn">{error}</div>)}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">{hasSearched ? `نتایج جستجو (${processedResults.length} اثر)` : 'آثار و ویرایش‌های اخیر'}</h2>
        <span className="text-sm text-gray-500">نمایش {processedResults.length} از {results.length} نتیجه</span>
      </div>
      {loading && results.length === 0 ? (
        <div className="text-center py-12 text-gray-500 animate-pulse bg-white rounded-xl border border-gray-100">در حال دریافت اطلاعات از پایگاه داده...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <p className="text-lg font-medium">هیچ اثری با این مشخصات یافت نشد.</p>
          {activeFiltersCount > 0 && (<button onClick={clearAllFilters} className="mt-3 text-indigo-600 hover:text-indigo-800 font-medium">حذف فیلترها و مشاهده همه آثار</button>)}
        </div>
      ) : (
        <div className="space-y-4">{processedResults.map((item) => (<EditionCard key={item.id} item={item} user={user} />))}</div>
      )}
    </div>
  );
}
