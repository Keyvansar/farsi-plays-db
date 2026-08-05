import PlayCard from './PlayCard';

export default function SearchResults({ results, loading, onCardClick }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-4 bg-gray-100 rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-gray-500 text-lg">هیچ اثری با این مشخصات یافت نشد.</p>
        <p className="text-gray-400 text-sm mt-2">فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map(edition => (
        <PlayCard key={edition.id} edition={edition} onClick={onCardClick} />
      ))}
    </div>
  );
}