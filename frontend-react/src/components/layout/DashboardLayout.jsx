import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = ({ children, activeTab, setActiveTab, date, setDate }) => {
  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <Header date={date} setDate={setDate} />
        {activeTab === 'Inicio' ? (
          children
        ) : (
          <div style={{ padding: '40px', color: '#94a3b8', textAlign: 'center' }}>
            <h2>Sección: {activeTab}</h2>
            <p>Esta sección está en construcción para la demo. Vuelve a <strong>Inicio</strong> para ver el radar.</p>
            <button className="btn-primary" style={{ marginTop: '20px', width: '200px' }} onClick={() => setActiveTab('Inicio')}>
              Volver al Radar
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardLayout;