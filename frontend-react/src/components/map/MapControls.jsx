import React from 'react';
import { Layers, Crosshair } from 'lucide-react';

const MapControls = ({ viewMode, setViewMode, showFires, setShowFires, showCoverage, setShowCoverage }) => {
  return (
    <>
      <div className="map-controls-top">
        <button className={`control-btn ${viewMode === 'satellite' ? 'active' : ''}`} onClick={() => setViewMode('satellite')}>
          <Layers size={16} /> Vista Satelital
        </button>
        <button className={`control-btn ${viewMode === 'gis' ? 'active' : ''}`} onClick={() => setViewMode('gis')}>
          Mapa GIS
        </button>
        <button className={`control-btn ${viewMode === 'heat' ? 'active' : ''}`} onClick={() => setViewMode('heat')}>
          Modo Calor
        </button>
      </div>
      <div className="map-layers-panel">
        <h4><Layers size={14} /> Capas</h4>
        <label><input type="checkbox" checked={showFires} onChange={(e) => setShowFires(e.target.checked)} /> Focos de Calor</label>
        <label><input type="checkbox" checked={showCoverage} onChange={(e) => setShowCoverage(e.target.checked)} /> Áreas Afectadas</label>
      </div>
      {showCoverage && (
        <div className="coverage-card">
          <div className="coverage-icon"><Crosshair size={20} /></div>
          <div><strong>Perú</strong><p>Cobertura: 98.7%</p><div className="coverage-bar"><div className="coverage-fill"></div></div></div>
        </div>
      )}
    </>
  );
};

export default MapControls;