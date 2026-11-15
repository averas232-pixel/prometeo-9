import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(7, 24, 43, 0.95)',
        border: '1px solid var(--cyan)',
        borderRadius: '6px',
        padding: '6px 10px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.75rem',
        boxShadow: '0 0 10px rgba(0, 217, 255, 0.2)'
      }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>{payload[0].name}</span>
        <span style={{ color: payload[0].payload.fill, marginLeft: '8px' }}>{payload[0].value}%</span>
      </div>
    );
  }
  return null;
};

export default function RegionDonutChart({ data }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!data || data.length === 0) return null;

  const activeData = data[activeIndex];

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
      {/* Gráfico */}
      <div style={{ width: '50%', height: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius="60%"
              outerRadius="85%" // Anillo más grueso
              paddingAngle={4} // Separación entre segmentos
              dataKey="value"
              stroke="none"
              onMouseEnter={(_, index) => setActiveIndex(index)}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill} 
                  style={{ 
                    filter: `drop-shadow(0px 0px 6px ${entry.fill}60)`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: activeIndex === index ? 1 : 0.7 // Resalta el seleccionado
                  }} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Texto Central Dinámico */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none', fontFamily: "'IBM Plex Mono', monospace"
        }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
            {activeData.value}%
          </div>
          <div style={{ fontSize: '0.65rem', color: activeData.fill }}>
            {activeData.name}
          </div>
        </div>
      </div>

      {/* Leyenda Lateral */}
      <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '10px' }}>
        {data.map((item, index) => (
          <div 
            key={item.name} 
            onMouseEnter={() => setActiveIndex(index)}
            style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              fontSize: '0.75rem', cursor: 'pointer',
              padding: '4px 8px', borderRadius: '4px',
              backgroundColor: activeIndex === index ? 'rgba(255,255,255,0.05)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.fill, boxShadow: `0 0 5px ${item.fill}` }}></div> 
              {item.name}
            </span>
            <strong style={{ color: activeIndex === index ? '#fff' : 'var(--text-dim)' }}>{item.value}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}