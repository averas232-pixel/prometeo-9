import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
const TemporalChart = ({ data }) => (
  <div className="glass-panel">
    <h3>Ventana Temporal</h3>
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }} />
        <Line type="monotone" dataKey="focos" stroke="var(--fire-orange)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
export default TemporalChart;