    import React, { useEffect, useState, useRef } from 'react';

export default function TacticalRadar({ fires }) {
  const [blips, setBlips] = useState([]);
  const radarRef = useRef(null);

  // Convertir lat/lon a coordenadas X/Y dentro del radar
  // Asumimos que el radar cubre un área de 20x20 grados alrededor del centro
  useEffect(() => {
    if (!fires || fires.length === 0) return;
    
    // Calcular el centro de los incendios para centrar el radar
    const avgLat = fires.reduce((sum, f) => sum + f.lat, 0) / fires.length;
    const avgLon = fires.reduce((sum, f) => sum + f.lon, 0) / fires.length;

    const mappedBlips = fires.map(f => {
      // Escala de -10 a +10 grados (ajusta según tu necesidad)
      const x = 50 + ((f.lon - avgLon) * 5); 
      const y = 50 - ((f.lat - avgLat) * 5); // Y invertida
      
      // Solo mostramos los que caen dentro del círculo del radar
      const dist = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(y - 50, 2));
      if (dist > 45) return null;

      return { x, y, intensity: f.total };
    }).filter(b => b !== null);

    setBlips(mappedBlips);
  }, [fires]);

  return (
    <div className="tactical-radar-container" ref={radarRef}>
      <div className="radar-sweep"></div>
      <div className="radar-circle radar-c1"></div>
      <div className="radar-circle radar-c2"></div>
      <div className="radar-circle radar-c3"></div>
      <div className="radar-cross-x"></div>
      <div className="radar-cross-y"></div>

      {blips.map((blip, i) => (
        <div 
          key={i} 
          className="radar-blip" 
          style={{ 
            left: `${blip.x}%`, 
            top: `${blip.y}%`,
            width: blip.intensity > 20 ? '6px' : '3px',
            height: blip.intensity > 20 ? '6px' : '3px',
            background: blip.intensity > 20 ? 'var(--red)' : 'var(--orange)',
            boxShadow: `0 0 8px ${blip.intensity > 20 ? 'var(--red)' : 'var(--orange)'}`
          }}
        />
      ))}
      
      <div className="radar-label">SCANNING...</div>
    </div>
  );
}