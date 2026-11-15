import React from 'react';
import { LayoutDashboard, Map, FileText, BarChart2, Settings, Satellite } from 'lucide-react';

const MENU_ITEMS = [
  { id: 'Inicio', icon: LayoutDashboard }, { id: 'Mapa', icon: Map },
  { id: 'Reportes', icon: FileText }, { id: 'Analytics', icon: BarChart2 },
  { id: 'Configuración', icon: Settings }
];

const Sidebar = ({ activeTab, setActiveTab }) => (
  <aside className="sidebar">
    <div className="logo">
      <Satellite color="var(--cyan-neon)" size={28} />
      <div><h1>PROMETEO-9</h1><span>FIRMS // LANCE</span></div>
    </div>
    <nav className="nav-menu">
      {MENU_ITEMS.map(item => (
        <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
          <item.icon size={20} /> <span>{item.id}</span>
        </button>
      ))}
    </nav>
    <div className="satellite-status">
      <Satellite size={24} color="var(--green-neon)" />
      <div><strong>Satélite</strong><span style={{ color: 'var(--green-neon)' }}>● En línea</span></div>
    </div>
  </aside>
);

export default Sidebar;