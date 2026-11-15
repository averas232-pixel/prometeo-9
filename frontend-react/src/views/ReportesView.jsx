import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { getCellsByDate } from '../services/api';

export default function ReportesView({ date }) {
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getCellsByDate(date)
      .then(data => setCells(data.slice(0, 50))) // Mostramos solo los 50 peores para no colapsar la tabla
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  const handleDownload = () => {
    window.location.href = `http://127.0.0.1:8000/download?date=${date}`;
  };

  return (
    <div className="glass-panel" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff' }}>REPORTE DIARIO DE INCENDIOS</h2>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            {loading ? 'Cargando datos...' : `Mostrando los top 50 hotspots de ${cells.length} detectados para ${date}`}
          </span>
        </div>
        <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--cyan)', color: '#000', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Download size={16} /> DESCARGAR CSV COMPLETO
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
              <th style={{ padding: '12px' }}>LATITUD</th>
              <th style={{ padding: '12px' }}>LONGITUD</th>
              <th style={{ padding: '12px' }}>MODIS</th>
              <th style={{ padding: '12px' }}>VIIRS</th>
              <th style={{ padding: '12px' }}>TOTAL DET.</th>
              <th style={{ padding: '12px' }}>FRP (MW)</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px', color: 'var(--text)' }}>{row.lat.toFixed(3)}</td>
                <td style={{ padding: '12px', color: 'var(--text)' }}>{row.lon.toFixed(3)}</td>
                <td style={{ padding: '12px', color: 'var(--cyan)' }}>{row.modis}</td>
                <td style={{ padding: '12px', color: 'var(--orange)' }}>{row.viirs}</td>
                <td style={{ padding: '12px', color: '#fff', fontWeight: 'bold' }}>{row.total}</td>
                <td style={{ padding: '12px', color: 'var(--red)' }}>{row.frp.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}