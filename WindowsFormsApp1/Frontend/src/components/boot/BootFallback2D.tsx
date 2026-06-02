import React from 'react';

// Static 2D fallback when WebGL is unavailable / errored.
export const BootFallback2D: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="boot-fallback-2d" aria-hidden>
      <div className="boot-fallback-orb" style={{ opacity: 0.35 + progress * 0.5 }} />
      <div className="boot-fallback-ring" />
      <div className="boot-fallback-ring boot-fallback-ring-2" />
    </div>
  );
};

interface State { hasError: boolean }

export class BootWebGLBoundary extends React.Component<{ progress: number; children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { /* swallow WebGL init errors */ }
  render() {
    if (this.state.hasError) return <BootFallback2D progress={this.props.progress} />;
    return this.props.children;
  }
}
