export default function DuplicateWarning({ 
  duplicateMatches, 
  selectedMergeTarget, 
  onSelectTarget 
}) {
  if (duplicateMatches.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p className="text-sm font-semibold text-yellow-800 mb-2">
        ⚠️ آثاری با عنوان مشابه پیدا شد:
      </p>
      <div className="space-y-2">
        {duplicateMatches.map((match) => (
          <div
            key={match.id}
            onClick={() => onSelectTarget(match)}
            className={`p-3 rounded-lg cursor-pointer transition-all border ${
              selectedMergeTarget?.id === match.id
                ? 'bg-indigo-100 border-indigo-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <p className="font-medium text-gray-900">{match.title_fa}</p>
            {match.publisher && <p className="text-sm text-gray-600">{match.publisher}</p>}
            {match.publication_year_solar && (
              <p className="text-xs text-gray-500">سال انتشار: {match.publication_year_solar}</p>
            )}
          </div>
        ))}
      </div>
      {selectedMergeTarget && (
        <p className="mt-3 text-sm text-indigo-700">
          ✅ شما در حال تکمیل اطلاعات اثر «{selectedMergeTarget.title_fa}» هستید.
        </p>
      )}
    </div>
  );
}