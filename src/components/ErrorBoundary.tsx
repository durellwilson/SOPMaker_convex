import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Error Boundary caught:", error, errorInfo);
    
    // Log specific TypeError related to voice recognition
    if (error instanceof TypeError && error.message.includes("Cannot read properties of undefined")) {
      console.warn("Voice recognition error detected - this may be due to an incomplete speech recognition event");
    }
    
    // Report error to monitoring service if available
    // In a production app, you would send this to your error monitoring service
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if this is a voice recognition related error
      const isVoiceError = this.state.error instanceof TypeError && 
        this.state.error.message.includes('Cannot read properties of undefined');
      
      return this.props.fallback || (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg mt-4">
          <h3 className="font-medium">{isVoiceError ? 'Voice Recognition Error' : 'Something went wrong'}</h3>
          <p className="text-sm mt-2">{this.state.error?.toString()}</p>
          {isVoiceError && (
            <div className="mt-3 text-sm">
              <p>This appears to be an issue with the voice recognition system.</p>
              <p className="mt-1">Try the following:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Check your microphone permissions</li>
                <li>Try speaking more clearly</li>
                <li>Refresh the page and try again</li>
              </ul>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}