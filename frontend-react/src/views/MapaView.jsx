import React from 'react';
import Map3D from '../components/map/Map3D';
import MapErrorBoundary from '../components/map/MapErrorBoundary';

export default function MapaView({ date, handleCellClick }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--cyan)', fontFamily: "'IBM Plex Mono', monospace" }}>MAPA GLOBAL DE HOTSPOTS</h2>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <MapErrorBoundary>
          <Map3D date={date} onCellClick={handleCellClick} />
        </MapErrorBoundary>
      </div>
    </div>
  );
}