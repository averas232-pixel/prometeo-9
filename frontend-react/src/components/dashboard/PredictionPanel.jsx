import React from 'react';
const PredictionPanel = ({ probability, status }) => (
  <div className="glass-panel ai-panel">
    <h3>IA // Predicción <span className="beta-tag">Beta</span></h3>
    <div className="ai-gauge">
      <div className="gauge-circle"><strong>{probability}%</strong></div>
      <div className="ai-text"><p>Alta probabilidad de incendios</p><span>Estado: {status}</span></div>
    </div>
  </div>
);
export default PredictionPanel;