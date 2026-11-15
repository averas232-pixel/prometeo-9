import { Component } from 'react';

export default class MapErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[Map3D]', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                      padding: 24, color: '#F0C27B', textAlign: 'center', fontSize: 13 }}>
          <div>
            <strong>El mapa no pudo iniciarse.</strong>
            <div style={{ color: '#9FB3CC', marginTop: 8 }}>{String(this.state.error.message)}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}