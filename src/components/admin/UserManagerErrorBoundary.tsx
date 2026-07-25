import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class UserManagerErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-900/50 text-white rounded-xl">
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <pre className="text-sm overflow-auto text-left" dir="ltr">{this.state.error?.toString()}</pre>
          <pre className="text-sm overflow-auto text-left" dir="ltr">{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
