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

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8" dir="rtl">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">خطایی رخ داده است</h2>
          <p className="text-sm text-gray-500 mb-4 max-w-md">
            متأسفانه مشکلی در بارگذاری این بخش پیش آمد. لطفاً صفحه را دوباره بارگذاری کنید.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              🔄 تلاش دوباره
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              📄 بارگذاری مجدد صفحه
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}