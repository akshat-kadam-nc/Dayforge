import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Change this (e.g. the route path) to reset the boundary after navigation. */
  resetKey?: string;
}
interface State {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors in the page tree. Without this, any thrown
 * error unmounts the whole React root and the user sees a blank white screen
 * (which is exactly what was happening on some pages). Instead we show a
 * readable message — and the actual error text — so failures are visible and
 * recoverable rather than silent.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaces in the browser console on every environment, incl. production.
    console.error('[Dayforge] page crashed:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="page-error glass-card" role="alert">
        <div className="page-error-emoji">😵‍💫</div>
        <h2>This page hit a snag</h2>
        <p className="muted">
          Something failed while rendering. The rest of the app still works — try again, or head
          back to Today.
        </p>
        <pre className="page-error-detail">{error.message || String(error)}</pre>
        <div className="page-error-actions">
          <button className="btn" type="button" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button
            className="link-btn"
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            Go to Today
          </button>
        </div>
      </div>
    );
  }
}
