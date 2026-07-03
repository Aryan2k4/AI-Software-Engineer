import { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-8">
          <div className="surface-elevated max-w-md w-full p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 flex items-center justify-center">
              <span className="text-red-400 text-xl">⚠</span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Something went wrong
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-[var(--accent-teal)] text-[var(--bg-base)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
