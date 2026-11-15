import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
const SensorChart = ({ data }) => (
  <div className="glass-panel">
    <h3>Comparación de Sensores</h3>
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>{data.map((entry, index) => <Cell key={index} fill={entry.fill} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);
export default SensorChart;