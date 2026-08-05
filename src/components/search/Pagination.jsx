export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 pt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        ← قبلی
      </button>
      
      <div className="flex gap-1">
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) pageNum = i + 1;
          else if (page <= 3) pageNum = i + 1;
          else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
          else pageNum = page - 2 + i;
          
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                pageNum === page
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        بعدی →
      </button>
    </div>
  );
}