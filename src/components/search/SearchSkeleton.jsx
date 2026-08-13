import React from 'react';

export default function SearchSkeleton({ count = 5 }) {
    return (
        <div className="space-y-4" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/3 mb-4"></div>
                    <div className="flex gap-2">
                        <div className="h-6 bg-gray-100 rounded-full w-16"></div>
                        <div className="h-6 bg-gray-100 rounded-full w-20"></div>
                        <div className="h-6 bg-gray-100 rounded-full w-14"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}