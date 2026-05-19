import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-slate-500 mb-6 max-w-sm">
            We encountered an unexpected error while blooming this page. Try refreshing the application.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-bloom-pink text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
