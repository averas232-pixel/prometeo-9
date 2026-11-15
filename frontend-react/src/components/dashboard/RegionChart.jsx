import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
const RegionChart = ({ data }) => (
  <div className="glass-panel bottom-card">
    <h3>Distribución por Región</h3>
    <ResponsiveContainer width="100%" height={130}>
      <PieChart><Pie data={data} dataKey="value" innerRadius={45} outerRadius={65} stroke="none">{data.map((entry, index) => <Cell key={index} fill={entry.fill} />)}</Pie></PieChart>
    </ResponsiveContainer>
  </div>
);
export default RegionChart;