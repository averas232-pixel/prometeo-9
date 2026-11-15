import React from 'react';
const MetricCard = ({ icon, label, value, change }) => (
  <div className="metric-card">
    {icon}
    <div><span>{label}</span><strong>{value} <small style={{ color: 'var(--green-neon)', fontSize: '0.7rem' }}>{change}</small></strong></div>
  </div>
);
export default MetricCard;