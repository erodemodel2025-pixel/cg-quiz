import React from 'react';
import { AlertCircle, Home, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onGoHome?: () => void;
  onReportError?: (msg: string) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onReportError?.(error.message || 'Unexpected UI error');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-lg mx-auto my-12 px-4">
          <div className="exam-card p-6 sm:p-8 text-center">
            <AlertCircle size={36} className="mx-auto text-[var(--exam-danger)] mb-3" />
            <h2 className="text-lg font-bold text-[var(--exam-text)] mb-2">
              Something went wrong while loading this quiz.
            </h2>
            <p className="text-sm text-[var(--exam-text-secondary)] mb-6">
              Your progress and saved data are safe. You can retry loading this view or return home.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="exam-btn exam-btn-primary text-sm"
              >
                <RotateCcw size={16} /> Retry
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  this.props.onGoHome?.();
                }}
                className="exam-btn exam-btn-secondary text-sm"
              >
                <Home size={16} /> Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
