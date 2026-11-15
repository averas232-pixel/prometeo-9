import React from 'react';
import { Flame, AlertTriangle, Bell } from 'lucide-react';

const Header = ({ date, setDate }) => (
  <header className="header">
    <div className="header-metrics">
      <div className="metric-card">
        <Flame color="var(--fire-red)" size={24} />
        <div><span>FOCOS ACTIVOS</span><strong>16,444 <small style={{color:'var(--green-neon)', fontSize:'0.7rem'}}>↑ +2.3%</small></strong></div>
      </div>
      <div className="metric-card">
        <AlertTriangle color="var(--fire-orange)" size={24} />
        <div><span>FRP TOTAL</span><strong>439,350 MW <small style={{color:'var(--green-neon)', fontSize:'0.7rem'}}>↑ +1.8%</small></strong></div>
      </div>
      <div className="metric-card">
        <Bell color="var(--fire-red)" size={24} />
        <div><span>ALERTAS</span><strong>223 <small style={{color:'var(--fire-red)', fontSize:'0.7rem'}}>↑ +4.7%</small></strong></div>
      </div>
    </div>
    <div className="header-right">
      <div className="api-badge"><span className="dot"></span> API LIVE</div>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ background: 'var(--bg-panel)', color: 'var(--cyan-neon)', border: '1px solid var(--border)', padding: '5px', borderRadius: '4px', fontFamily: 'monospace' }} />
    </div>
  </header>
);

export default Header;