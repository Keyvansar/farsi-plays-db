// ===== ERROR BOUNDARY COMPONENT =====
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ⚠️
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">خطایی رخ داد</h2>
            <p className="text-gray-600 mb-6">
              متأسفانه مشکلی پیش آمد. لطفاً صفحه را بازسازی کنید.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md"
            >
              بازسازی صفحه
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-right">
                <summary className="cursor-pointer text-sm text-gray-500">جزئیات فنی</summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto text-red-700">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
