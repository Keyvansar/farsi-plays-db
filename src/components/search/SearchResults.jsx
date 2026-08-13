import React from 'react';
import PlayCard from './PlayCard';
import SearchSkeleton from './SearchSkeleton';

export default function SearchResults({ results, loading, onCardClick }) {
  // Skeleton loaders while fetching
  if (loading) {
    return <SearchSkeleton count={5} />;
  }

  // Empty state
  if (!results || results.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">نتیجه‌ای یافت نشد</h3>
        <p className="text-sm text-gray-500">
          فیلترها را تغییر دهید یا عبارت جستجوی دیگری امتحان کنید.
        </p>
      </div>
    );
  }

  // Results
  return (
    <div className="space-y-4">
      {results.map((edition) => (
        <PlayCard
          key={edition.id}
          edition={edition}
          onClick={() => onCardClick(edition)}
        />
      ))}
    </div>
  );
}