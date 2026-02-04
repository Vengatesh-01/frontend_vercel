import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full border border-red-100">
                        <h1 className="text-3xl font-bold text-red-600 mb-4">Something went wrong</h1>
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                            <p className="font-mono text-sm text-red-800 whitespace-pre-wrap break-words">
                                {this.state.error && this.state.error.toString()}
                            </p>
                        </div>
                        <details className="group">
                            <summary className="cursor-pointer text-gray-600 font-medium hover:text-gray-900 transition-colors">
                                View Component Stack Trace
                            </summary>
                            <div className="mt-4 p-4 bg-gray-900 rounded-md overflow-x-auto">
                                <pre className="text-xs text-green-400 font-mono">
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </pre>
                            </div>
                        </details>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
