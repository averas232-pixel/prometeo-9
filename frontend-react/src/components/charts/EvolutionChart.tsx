import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

// 1. Definimos la interfaz para los datos que vienen del backend
interface EvolutionData {
  date: string;
  focos: number;
  area?: number; // Área afectada (opcional por si el backend no lo envía siempre)
}

interface EvolutionChartProps {
  data: EvolutionData[];
}

// 2. Tooltip Personalizado con el estilo de PROMETEO-9
const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(7, 24, 43, 0.95)',
        border: '1px solid var(--cyan)',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: '0 4px 15px rgba(0, 217, 255, 0.2)',
        fontFamily: "'IBM Plex Mono', monospace"
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
          Fecha: {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
            <div style={{ 
              width: '8px', height: '8px', borderRadius: '50%', 
              backgroundColor: entry.color,
              boxShadow: `0 0 8px ${entry.color}` 
            }} />
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
              {entry.name}:
            </span>
            <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              {entry.name === 'Área (ha)' ? ' ha' : ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// 3. Componente Principal
export default function EvolutionChart({ data }: EvolutionChartProps) {
  // Si no hay datos, mostramos un estado vacío elegante
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        {/* Definición de los degradados */}
        <defs>
          <linearGradient id="colorFocos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--orange)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--orange)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Cuadrícula horizontal discreta */}
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        
        {/* Eje X (Fechas) */}
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 10, fill: 'var(--text-dim)', fontFamily: "'IBM Plex Mono', monospace" }} 
          axisLine={false} 
          tickLine={false} 
          dy={10}
        />
        
        {/* Eje Y Izquierdo (Focos) */}
        <YAxis 
          yAxisId="left"
          tick={{ fontSize: 10, fill: 'var(--orange)', fontFamily: "'IBM Plex Mono', monospace" }} 
          axisLine={false} 
          tickLine={false} 
          width={50}
        />
        
        {/* Eje Y Derecho (Área) - Oculto visualmente para no saturar, pero mantiene la escala */}
        <YAxis 
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 10, fill: 'var(--cyan)', fontFamily: "'IBM Plex Mono', monospace" }} 
          axisLine={false} 
          tickLine={false}
          width={50}
        />

        {/* Tooltip */}
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />

        {/* Línea y Área de Focos Activos (Naranja) */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="focos"
          name="Focos Activos"
          stroke="var(--orange)"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorFocos)"
          dot={{ r: 3, fill: 'var(--bg-card)', stroke: 'var(--orange)', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: 'var(--orange)', stroke: '#fff', strokeWidth: 2 }}
          animationDuration={1500}
        />

        {/* Línea y Área de Área Afectada (Cian) */}
        {data[0]?.area !== undefined && (
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="area"
            name="Área (ha)"
            stroke="var(--cyan)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorArea)"
            dot={{ r: 3, fill: 'var(--bg-card)', stroke: 'var(--cyan)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: 'var(--cyan)', stroke: '#fff', strokeWidth: 2 }}
            animationDuration={1500}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}