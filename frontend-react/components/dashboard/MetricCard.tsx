import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, change }) => (
  <div className="metric-card">
    {icon}
    <div>
      <span>{label}</span>
      <strong>{value} <small style={{ color: 'var(--green-neon)', fontSize: '0.7rem' }}>{change}</small></strong>
    </div>
  </div>
);