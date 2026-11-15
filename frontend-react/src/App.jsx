import React, { useState } from 'react';
import { LayoutDashboard, Map, FileText, BarChart2, Settings, Flame, AlertTriangle, Bell, Satellite } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Map3D from './components/map/Map3D';
import MetricCard from './components/dashboard/MetricCard';
import MapErrorBoundary from './components/map/MapErrorBoundary';
import './App.css';

const evolutionData = [
  { date: '15/08', focos: 6000 }, { date: '16/08', focos: 7500 },
  { date: '17/08', focos: 11000 }, { date: '18/08', focos: 9000 },
];
const sensorData = [
  { name: 'MODIS', total: 15000, fill: '#168BFF' },
  { name: 'VIIRS', total: 12800, fill: '#FF9D00' },
  { name: 'Coinciden', total: 10200, fill: '#00D5F2' },
];
const regionData = [
  { name: 'Amazonía', value: 65, fill: '#FF9D00' },
  { name: 'Sierra', value: 22, fill: '#168BFF' },
  { name: 'Costa', value: 13, fill: '#00D5F2' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('Inicio');
  const [date, setDate] = useState('2019-08-25');
  const [aiData, setAiData] = useState({ prob: 0, status: 'ESPERA' });

  const handleCellClick = async (cell) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/predict?lat=${cell.lat}&lon=${cell.lon}`);
      const pred = await res.json();
      setAiData({ prob: pred.probability, status: pred.probability > 75 ? 'CRÍTICO' : 'NORMAL' });
    } catch (err) { 
      console.error(err); 
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo">
          <Flame color="var(--fire-red)" size={28} />
          <div><h1>PROMETEO-9</h1><span>FIRMS // LANCE</span></div>
        </div>
        <nav className="nav-menu">
          {[{ id: 'Inicio', icon: LayoutDashboard }, { id: 'Mapa', icon: Map }, { id: 'Reportes', icon: FileText }, { id: 'Analytics', icon: BarChart2 }, { id: 'Configuración', icon: Settings }].map(item => (
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

      <main className="main-content">
        <header className="header">
          <div className="header-metrics">
            <MetricCard icon={<Flame color="var(--fire-red)" />} label="FOCOS ACTIVOS" value="16,444" change="↑ +2.3%" />
            <MetricCard icon={<AlertTriangle color="var(--fire-orange)" />} label="FRP TOTAL" value="439,350 MW" change="↑ +1.8%" />
            <MetricCard icon={<Bell color="var(--fire-red)" />} label="ALERTAS" value="223" change="↑ +4.7%" />
          </div>
          <div className="header-right">
            <div className="api-badge"><span className="dot"></span> API LIVE</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ background: 'var(--bg-panel)', color: 'var(--cyan-neon)', border: '1px solid var(--border)', padding: '5px', borderRadius: '4px' }} />
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="map-wrapper">
            <MapErrorBoundary>
              <Map3D date={date} onCellClick={handleCellClick} />
            </MapErrorBoundary>
            
            <div className="map-controls-top">
              <button className="control-btn active">Vista Satelital</button>
              <button className="control-btn">Modo Calor</button>
            </div>
          </div>

          <div className="right-panel">
            <div className="glass-panel">
              <h3>Ventana Temporal</h3>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }} />
                  <Line type="monotone" dataKey="focos" stroke="var(--fire-orange)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-panel">
              <h3>Comparación de Sensores</h3>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={sensorData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {sensorData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-panel ai-panel">
              <h3>IA // Predicción</h3>
              <div className="ai-gauge">
                <div className="gauge-circle"><strong>{aiData.prob}%</strong></div>
                <div className="ai-text"><p>Probabilidad de incendios</p><span>Estado: {aiData.status}</span></div>
              </div>
            </div>
          </div>

          <div className="bottom-panel">
            <div className="glass-panel bottom-card">
              <h3>Evolución Temporal</h3>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Line type="monotone" dataKey="focos" stroke="var(--fire-orange)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-panel bottom-card">
              <h3>Distribución por Región</h3>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={regionData} dataKey="value" innerRadius={45} outerRadius={65} stroke="none">
                    {regionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-panel bottom-card">
              <h3>Eventos Recientes</h3>
              <ul className="event-list">
                <li><span className="dot-red"></span> 21:05 Nuevo foco en Loreto</li>
                <li><span className="dot-orange"></span> 20:48 Incremento en Ucayali</li>
                <li><span className="dot-blue"></span> 20:32 Área afectada: +1,2k ha</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}