import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import Orrery from './Orrery';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Orrery render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          width: '100vw', height: '100dvh', background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cormorant Garamond', serif", color: '#fff',
          flexDirection: 'column', gap: 16, padding: 32,
        }}>
          <div style={{ fontSize: 24, letterSpacing: 2 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 400, textAlign: 'center' }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', padding: '8px 24px', borderRadius: 4, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, marginTop: 8,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Orrery />
    </ErrorBoundary>
  );
}
