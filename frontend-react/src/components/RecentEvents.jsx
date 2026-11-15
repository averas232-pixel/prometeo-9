import React from 'react';
import { Flame, AlertTriangle, Info, ShieldAlert, ChevronRight } from 'lucide-react';

// Función para asignar icono y color según el nivel de gravedad
const getEventStyle = (level) => {
  switch (level) {
    case 'critical': return { color: 'var(--red)', icon: Flame, label: 'CRÍTICO' };
    case 'high': return { color: 'var(--orange)', icon: AlertTriangle, label: 'ALTO' };
    case 'info': return { color: 'var(--blue)', icon: Info, label: 'INFO' };
    case 'warning': return { color: '#FFD700', icon: ShieldAlert, label: 'ADVERTENCIA' };
    default: return { color: 'var(--text-dim)', icon: Info, label: 'LOG' };
  }
};

export default function RecentEvents({ events, onViewAll }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={16} /> Eventos Recientes
        </h3>
        <button onClick={onViewAll} style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          Ver todos <ChevronRight size={12} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        {events.map((ev, index) => {
          const style = getEventStyle(ev.level);
          const Icon = style.icon;
          
          return (
            <div 
              key={ev.id} 
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0',
                borderBottom: index !== events.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                cursor: 'pointer', transition: 'background 0.2s', borderRadius: '4px'
              }}
              className="event-row-hover"
              // Aquí conectarías con tu mapa: onClick={() => centerMap(ev.lat, ev.lon)}
            >
              {/* Icono de Gravedad */}
              <div style={{ 
                width: '24px', height: '24px', borderRadius: '50%', 
                background: `rgba(${style.color === 'var(--red)' ? '255,48,77' : style.color === 'var(--orange)' ? '255,151,0' : '7,139,255'}, 0.15)`,
                display: 'flex', justifyContent: 'center', alignItems: 'center'
              }}>
                <Icon size={12} color={style.color} />
              </div>

              {/* Hora */}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: "'IBM Plex Mono', monospace", minWidth: '40px' }}>
                {ev.time}
              </span>

              {/* Descripción */}
              <span style={{ fontSize: '0.75rem', color: '#e2e8f0', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ev.desc}
              </span>

              {/* Etiqueta de Estado */}
              <span style={{ 
                fontSize: '0.55rem', fontWeight: 'bold', letterSpacing: '0.5px',
                color: style.color, border: `1px solid ${style.color}`, 
                padding: '2px 4px', borderRadius: '3px', opacity: 0.8
              }}>
                {style.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Importación necesaria para el título
import { Activity } from 'lucide-react';