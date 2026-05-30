import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by boundary:", error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-4">
          <div className="max-w-md w-full rounded-2xl border border-red-500/20 bg-slate-900/50 p-8 text-center backdrop-blur-sm">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h1 className="mb-2 text-2xl font-bold text-white">Oops! Something went wrong</h1>
            <p className="mb-6 text-slate-400">
              We encountered an unexpected error. Don't worry—your data is safe.
            </p>

            {process.env.NODE_ENV === "development" && (
              <div className="mb-6 rounded-lg bg-red-900/20 p-4 text-left text-xs text-red-300">
                <p className="font-semibold mb-2">Error Details (Dev Only):</p>
                <code className="block overflow-auto break-words">{this.state.error?.toString()}</code>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              <RefreshCw size={18} />
              Reload Page
            </button>

            <p className="mt-4 text-xs text-slate-500">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
