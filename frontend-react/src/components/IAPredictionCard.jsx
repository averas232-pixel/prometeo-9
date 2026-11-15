// --- COMPONENTE: IA PREDICCIÓN (ROBOT A LA IZQUIERDA) ---
const IAPredictionCard = ({ aiData }) => {
  const isCritical = aiData.prob > 75;
  const color = isCritical ? 'var(--red)' : 'var(--cyan)';

  return (
    <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px' }}>
      
      {/* Encabezado */}
      <div className="panel-header" style={{ zIndex: 2, marginBottom: '0px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Bot size={18} color="var(--cyan)" /> IA // Predicción
        </h3>
        <span className="badge-alert" style={{ color: 'var(--orange)', borderColor: 'var(--orange)' }}>KNN</span>
      </div>

      {/* Contenedor principal de dos columnas */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
        
        {/* MITAD IZQUIERDA: EL ROBOT */}
        <div style={{ width: '50%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          
          {/* Resplandor de fondo */}
          <div style={{
            position: 'absolute', width: '120px', height: '120px',
            background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
            zIndex: 1, borderRadius: '50%'
          }} />

          {/* Imagen del Robot Importada */}
          <img 
            src={robotImg} 
            alt="AI Robot" 
            style={{ 
              width: '110px', 
              height: 'auto', 
              zIndex: 2, 
              objectFit: 'contain',
              filter: `drop-shadow(0px 0px 15px ${color}80)`,
              animation: 'float 3s ease-in-out infinite' 
            }} 
          />
        </div>

        {/* MITAD DERECHA: CÍRCULO Y TEXTOS */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingLeft: '10px' }}>
          
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px' }}>
            <svg width="70" height="70" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke={color} strokeWidth="8" strokeDasharray={`${aiData.prob * 2.51} 251`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: 'stroke-dasharray 1s ease-out' }} />
            </svg>
            <strong style={{ position: 'absolute', fontSize: '1.1rem', fontFamily: "'IBM Plex Mono', monospace", color: '#fff' }}>{aiData.prob}%</strong>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.8rem', lineHeight: '1.2', margin: 0 }}>
              {isCritical ? 'Riesgo Crítico' : 'Probabilidad de incendios'}
            </p>
            <span style={{ fontSize: '0.7rem', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px' }}>
              <Activity size={12} /> Próximas 24h
            </span>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};