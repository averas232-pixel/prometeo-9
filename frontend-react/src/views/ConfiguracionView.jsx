import React from 'react';

export default function ConfiguracionView() {
  return (
    <div className="glass-panel" style={{ flex: 1, padding: '24px' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#fff' }}>CONFIGURACIÓN</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>Fuente de Datos</label>
          <select className="date-input" style={{ width: '100%' }}>
            <option>MODIS + VIIRS (Armonizado)</option>
            <option>Solo MODIS</option>
            <option>Solo VIIRS</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>Paleta de Colores del Mapa</label>
          <select className="date-input" style={{ width: '100%' }}>
            <option>Alta Densidad (Rojo/Naranja)</option>
            <option>Accesible (Cividis/Viridis)</option>
          </select>
        </div>

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <h4 style={{ color: 'var(--text)', margin: '0 0 8px 0' }}>Acerca de PROMETEO-9</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', lineHeight: '1.5' }}>
            Herramienta desarrollada para el NASA Space Apps Challenge. Armoniza datos de hotspots de MODIS y VIIRS de NASA FIRMS.
          </p>
        </div>
      </div>
    </div>
  );
}