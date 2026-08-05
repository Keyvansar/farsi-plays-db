import { useFormContext } from 'react-hook-form';

export default function CastSection({ castWarning }) {
  const { register, watch } = useFormContext();
  const watchedCastUnknown = watch('cast_unknown');

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <h3 className="text-sm font-bold text-gray-700 mb-3">🎭 مشخصات بازیگران</h3>

      <div className="flex items-center gap-3 mb-3">
        <input
          type="checkbox"
          {...register('cast_unknown')}
          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label className="text-sm text-gray-600">
          تعداد بازیگران نامشخص است
        </label>
      </div>

      {!watchedCastUnknown && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">مرد</label>
              <input type="number" {...register('cast_men')} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">زن</label>
              <input type="number" {...register('cast_women')} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">نامشخص</label>
              <input type="number" {...register('cast_nonspecific')} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">مجموع</label>
              <input
                type="text"
                {...register('cast_total')}
                readOnly
                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 text-gray-500"
              />
            </div>
          </div>
          {castWarning && (
            <p className="mt-2 text-xs text-yellow-700">{castWarning}</p>
          )}
        </>
      )}
    </div>
  );
}