import React from 'react';
const RecentEvents = () => (
  <div className="glass-panel bottom-card">
    <h3>Eventos Recientes</h3>
    <ul className="event-list">
      <li><span className="dot-red"></span> <strong>21:05</strong> Nuevo foco en Loreto</li>
      <li><span className="dot-orange"></span> <strong>20:48</strong> Incremento en Ucayali</li>
      <li><span className="dot-blue"></span> <strong>20:32</strong> Área afectada: +1,2k ha</li>
    </ul>
  </div>
);
export default RecentEvents;