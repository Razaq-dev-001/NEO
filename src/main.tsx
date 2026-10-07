import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('NEO UI Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#070a11] text-white flex flex-col items-center justify-center p-6 text-center font-sans select-none">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center mb-4 text-cyan-400 text-2xl font-bold shadow-lg shadow-cyan-500/20">
            🤖
          </div>
          <h1 className="text-xl font-bold mb-2 bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
            NEO Companion System Restoring
          </h1>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            {this.state.error?.message || 'A visual renderer restart is required.'}
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('neo_sqlite_binary');
              window.location.reload();
            }}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
          >
            Restart NEO Companion
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
