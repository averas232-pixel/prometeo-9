import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Map, FileText, BarChart2, Flame, AlertTriangle, 
  Bell, Satellite, Clock, Activity, Play, Pause, ChevronLeft, ChevronRight, 
  Calendar, ChartNoAxesCombined, ChartPie, Zap, MapPin, Bot, Info, ShieldAlert, ChevronRight as ChevronRightIcon, Map as MapIcon, X, TrendingUp
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, PieChart, Pie, AreaChart, Area 
} from 'recharts';

import Map3D from './components/map/Map3D';
import MapErrorBoundary from './components/map/MapErrorBoundary';
import { getCellsByDate, getPrediction, getLatestDate, getAnomaly } from './services/api';
import './App.css';

import MapaView from './views/MapaView';
import ReportesView from './views/ReportesView';
import AnalyticsView from './views/AnalyticsView';

// --- COMPONENTE DE FECHA HÍBRIDO ---
const DateInput = ({ date, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(date || '');

  useEffect(() => { setInputValue(date); }, [date]);

  const handleCommit = () => {
    if (inputValue && inputValue !== date && /^\d{4}-\d{2}-\d{2}$/.test(inputValue)) {
      onChange(inputValue);
    } else {
      setInputValue(date); 
    }
    setIsEditing(false);
  };

  return (
    <div className="custom-date-wrapper" style={{ width: '100%', marginBottom: '8px' }}>
      <Calendar size={14} style={{ color: 'var(--cyan)', marginRight: '6px' }} />
      {isEditing ? (
        <input 
          type="text" value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
          placeholder="YYYY-MM-DD" autoFocus className="date-text-input font-mono"
          style={{ width: '100%' }}
        />
      ) : (
        <span className="date-display font-mono" onClick={() => setIsEditing(true)} style={{ flex: 1, textAlign: 'left' }}>
          {inputValue ? inputValue.split('-').reverse().join('/') : 'Seleccionar Fecha'}
        </span>
      )}
      <input 
        type="date" value={inputValue} 
        onChange={(e) => { setInputValue(e.target.value); onChange(e.target.value); setIsEditing(false); }}
        className="hidden-date-input" 
      />
    </div>
  );
};

// --- COMPONENTES DE GRÁFICOS Y TARJETAS ---
const CustomTooltipEvo = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(7, 24, 43, 0.95)', border: '1px solid var(--cyan)', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 4px 15px rgba(0, 217, 255, 0.2)', fontFamily: "'IBM Plex Mono', monospace" }}>
        <p style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>{label}</p>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }} />
            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>{entry.name}:</span>
            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              {entry.name === 'Área (ha)' ? ' ha' : ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const EvolutionChart = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>Sin datos para mostrar</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="colorFocos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--orange)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--orange)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-dim)', fontFamily: "'IBM Plex Mono', monospace" }} axisLine={false} tickLine={false} dy={6} />
        <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'var(--orange)', fontFamily: "'IBM Plex Mono', monospace" }} axisLine={false} tickLine={false} width={35} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'var(--cyan)', fontFamily: "'IBM Plex Mono', monospace" }} axisLine={false} tickLine={false} width={35} />
        <Tooltip content={<CustomTooltipEvo />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Area yAxisId="left" type="monotone" dataKey="focos" name="Focos" stroke="var(--orange)" strokeWidth={2} fillOpacity={1} fill="url(#colorFocos)" dot={{ r: 2, fill: 'var(--bg-card)', stroke: 'var(--orange)', strokeWidth: 1.5 }} activeDot={{ r: 4, fill: 'var(--orange)', stroke: '#fff', strokeWidth: 1.5 }} animationDuration={1500} />
        {data[0]?.area !== undefined && (
          <Area yAxisId="right" type="monotone" dataKey="area" name="Área (ha)" stroke="var(--cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorArea)" dot={{ r: 2, fill: 'var(--bg-card)', stroke: 'var(--cyan)', strokeWidth: 1.5 }} activeDot={{ r: 4, fill: 'var(--cyan)', stroke: '#fff', strokeWidth: 1.5 }} animationDuration={1500} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};

const RegionDonutChart = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!data || data.length === 0) return null;
  const activeData = data[activeIndex];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(7, 24, 43, 0.95)', border: '1px solid var(--cyan)', borderRadius: '6px', padding: '4px 8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', boxShadow: '0 0 10px rgba(0, 217, 255, 0.2)' }}>
          <span style={{ color: '#fff', fontWeight: 'bold' }}>{payload[0].name}</span>
          <span style={{ color: payload[0].payload.fill, marginLeft: '6px' }}>{payload[0].value}%</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
      <div style={{ width: '45%', height: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius="60%" outerRadius="85%" paddingAngle={4} dataKey="value" stroke="none" onMouseEnter={(_, index) => setActiveIndex(index)}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} style={{ filter: `drop-shadow(0px 0px 4px ${entry.fill}60)`, cursor: 'pointer', transition: 'all 0.3s ease', opacity: activeIndex === index ? 1 : 0.7 }} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', fontFamily: "'IBM Plex Mono', monospace" }}>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{activeData.value}%</div>
          <div style={{ fontSize: '0.55rem', color: activeData.fill }}>{activeData.name}</div>
        </div>
      </div>
      <div style={{ width: '55%', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '5px' }}>
        {data.map((item, index) => (
          <div key={item.name} onMouseEnter={() => setActiveIndex(index)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', backgroundColor: activeIndex === index ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'background 0.2s' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: item.fill, boxShadow: `0 0 5px ${item.fill}` }}></div> 
              {item.name}
            </span>
            <strong style={{ color: activeIndex === index ? '#fff' : 'var(--text-dim)' }}>{item.value}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentEvents = ({ events, onEventClick }) => {
  const getEventStyle = (level) => {
    switch (level) {
      case 'critical': return { color: 'var(--red)', icon: Flame, label: 'CRÍTICO' };
      case 'high': return { color: 'var(--orange)', icon: AlertTriangle, label: 'ALTO' };
      case 'info': return { color: 'var(--blue)', icon: Info, label: 'INFO' };
      case 'warning': return { color: '#FFD700', icon: ShieldAlert, label: 'ADVERTENCIA' };
      default: return { color: 'var(--text-dim)', icon: Info, label: 'LOG' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <h3 style={{ fontSize: '0.7rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
          <Zap size={12} /> Eventos Recientes
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', gap: '2px' }}>
        {events.map((ev, index) => {
          const style = getEventStyle(ev.level);
          const Icon = style.icon;
          return (
            <div key={ev.id} className="event-row-hover" onClick={() => onEventClick(ev.lat, ev.lon)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0', borderBottom: index !== events.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: ev.lat ? 'pointer' : 'default', transition: 'background 0.2s', borderRadius: '4px' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `rgba(${style.color === 'var(--red)' ? '255,48,77' : style.color === 'var(--orange)' ? '255,151,0' : style.color === '#FFD700' ? '255,215,0' : '7,139,255'}, 0.15)`, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                <Icon size={9} color={style.color} />
              </div>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: "'IBM Plex Mono', monospace", minWidth: '30px' }}>{ev.time}</span>
              <span style={{ fontSize: '0.65rem', color: '#e2e8f0', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.desc}</span>
              <span style={{ fontSize: '0.45rem', fontWeight: 'bold', letterSpacing: '0.5px', color: style.color, border: `1px solid ${style.color}`, padding: '1px 3px', borderRadius: '3px', opacity: 0.8, flexShrink: 0 }}>{style.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// TARJETA DE ANOMALÍA COMPACTA PARA EL SIDEBAR
const AnomalyCard = ({ data }) => {
  if (!data) return null;

  const isPositive = data.anomaly_pct > 0;
  const color = isPositive ? 'var(--red)' : 'var(--green)';
  const displayPct = Math.min(data.anomaly_pct, 999); 
  
  return (
    <div style={{ 
      background: 'rgba(0,0,0,0.2)', 
      border: '1px solid rgba(255,255,255,0.05)', 
      borderRadius: '8px', 
      padding: '10px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '6px',
      marginBottom: '15px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: 'bold' }}>
        <TrendingUp size={12} color={color} /> ANOMALÍA HISTÓRICA
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ 
          width: '35px', height: '35px', borderRadius: '50%', 
          background: isPositive ? 'rgba(255, 48, 77, 0.15)' : 'rgba(0, 214, 143, 0.15)',
          border: `1px solid ${color}`,
          display: 'grid', placeItems: 'center', flexShrink: 0
        }}>
          <strong style={{ color: color, fontSize: '0.6rem' }}>
            {isPositive ? '+' : ''}{displayPct}%
          </strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 'bold' }}>
            {data.status === 'CRÍTICO' ? 'Crítico' : data.status === 'ALERTA' ? 'Elevado' : 'Normal'}
          </span>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>
            Act: {data.current} | Hist: {Math.round(data.avg)}
          </span>
        </div>
      </div>
    </div>
  );
};

const IAPredictionCard = ({ aiData }) => {
  const isCritical = aiData.prob > 75;
  const color = isCritical ? 'var(--red)' : 'var(--cyan)';
  
  return (
    <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '8px', minHeight: '130px' }}>
      <div className="panel-header" style={{ zIndex: 2, marginBottom: '2px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0, fontSize: '0.7rem' }}>
          <Bot size={12} color="var(--cyan)" /> IA // Predicción
        </h3>
        <span className="badge-alert" style={{ color: 'var(--orange)', borderColor: 'var(--orange)', fontSize: '0.5rem', padding: '1px 4px' }}>KNN</span>
      </div>
      
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
        <div style={{ width: '45%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ position: 'absolute', width: '50px', height: '50px', background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`, zIndex: 1, borderRadius: '50%' }} />
          <img src="/robot.png" alt="AI Robot" style={{ width: 'auto', height: '85%', maxHeight: '70px', zIndex: 2, objectFit: 'contain', filter: `drop-shadow(0px 0px 10px ${color}80)`, animation: 'float 3s ease-in-out infinite' }} />
        </div>
        
        <div style={{ width: '55%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '2px' }}>
            <svg width="45" height="45" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke={color} strokeWidth="8" strokeDasharray={`${aiData.prob * 2.51} 251`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: 'stroke-dasharray 1s ease-out' }} />
            </svg>
            <strong style={{ position: 'absolute', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", color: '#fff' }}>{aiData.prob}%</strong>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.55rem', lineHeight: '1.1', margin: 0 }}>
              {isCritical ? 'Riesgo Elevado' : 'Análisis de Riesgo'}
            </p>
            <span style={{ fontSize: '0.5rem', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', marginTop: '2px' }}>
              <Activity size={10} /> Basado en historial
            </span>
          </div>
        </div>
      </div>
      <style>{`@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-4px); } 100% { transform: translateY(0px); } }`}</style>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('Inicio');
  const [date, setDate] = useState('');
  const [dataSource, setDataSource] = useState('harmonized');
  const [aiData, setAiData] = useState({ prob: 0, status: 'SIN SELECCIÓN' });
  const [utcTime, setUtcTime] = useState(new Date().toISOString().slice(11, 19));
  
  const [metrics, setMetrics] = useState({ total: 0, frp: 0, alerts: 0 });
  const [sensorData, setSensorData] = useState([]);
  const [evolutionData, setEvolutionData] = useState([]);
  const [anomalyData, setAnomalyData] = useState(null);
  
  const [timeRange, setTimeRange] = useState('7d'); 
  const [mapCenter, setMapCenter] = useState(null);
  const [mapMode, setMapMode] = useState('satellite'); 
  const [selectedCountry, setSelectedCountry] = useState('Perú');
  const [bbox, setBbox] = useState(null);
  
  const [isFocusMode, setIsFocusMode] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const playInterval = useRef(null);

  const recentEvents = [
    { id: 1, time: '21:05', desc: 'Nuevo foco en Loreto', level: 'critical', lat: -3.7, lon: -73.2 },
    { id: 2, time: '20:48', desc: 'Incremento en Ucayali', level: 'high', lat: -9.5, lon: -73.0 },
    { id: 3, time: '20:32', desc: 'Área afectada: +1.2k ha', level: 'info' },
    { id: 4, time: '19:50', desc: 'Alerta por riesgo en San Martín', level: 'warning', lat: -7.2, lon: -76.8 },
  ];

  const regionData = [
    { name: 'Amazonía', value: 65, fill: '#FF9700' },
    { name: 'Sierra', value: 22, fill: '#078BFF' },
    { name: 'Costa', value: 13, fill: '#00D9FF' },
  ];

  useEffect(() => {
    const timer = setInterval(() => setUtcTime(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedDate = localStorage.getItem('prometeo_date');
    if (savedDate) setDate(savedDate);
    else {
      getLatestDate().then(res => {
        setDate(res.latest);
        localStorage.setItem('prometeo_date', res.latest);
      }).catch(() => setDate('2020-01-10'));
    }
  }, []);

  useEffect(() => {
    if (!date) return;
    const loadData = async () => {
      try {
        const cells = await getCellsByDate(date, bbox);
        const total = cells.reduce((sum, c) => sum + c.total, 0);
        const frp = cells.reduce((sum, c) => sum + c.frp, 0);
        const alerts = cells.filter(c => c.total > 15).length;
        setMetrics({ total, frp, alerts });

        let modisTotal = 0, viirsTotal = 0, both = 0;
        cells.forEach(c => {
          modisTotal += c.modis;
          viirsTotal += c.viirs;
          if (c.modis > 0 && c.viirs > 0) both++;
        });
        
        if (dataSource === 'modis') {
          setSensorData([{ name: 'MODIS', total: modisTotal, fill: '#078BFF' }]);
        } else if (dataSource === 'viirs') {
          setSensorData([{ name: 'VIIRS', total: viirsTotal, fill: '#FF9700' }]);
        } else {
          setSensorData([
            { name: 'MODIS', total: modisTotal, fill: '#078BFF' },
            { name: 'VIIRS', total: viirsTotal, fill: '#FF9700' },
            { name: 'Ambos', total: both, fill: '#00D9FF' },
          ]);
        }

        setEvolutionData([
          { date: 'D-3', focos: Math.floor(total * 0.6), area: Math.floor(total * 0.5) },
          { date: 'D-2', focos: Math.floor(total * 0.8), area: Math.floor(total * 0.7) },
          { date: 'D-1', focos: Math.floor(total * 0.9), area: Math.floor(total * 0.85) },
          { date: 'Hoy', focos: total, area: Math.floor(total * 0.9) },
        ]);
      } catch (err) { console.error(err); }
    };
    loadData();
  }, [date, dataSource, timeRange, bbox]);

  useEffect(() => {
    if (!date) return;
    getAnomaly(date)
      .then(data => setAnomalyData(data))
      .catch(console.error);
  }, [date]);

  useEffect(() => {
    if (isPlaying) {
      playInterval.current = setInterval(() => {
        setDate(prevDate => {
          const d = new Date(prevDate);
          d.setDate(d.getDate() + 1);
          const newDate = d.toISOString().split('T')[0];
          localStorage.setItem('prometeo_date', newDate);
          return newDate;
        });
      }, 1500);
    } else {
      clearInterval(playInterval.current);
    }
    return () => clearInterval(playInterval.current);
  }, [isPlaying]);

  const handleDateChange = (newDate) => {
    setDate(newDate);
    localStorage.setItem('prometeo_date', newDate);
  };

  const changeDateBy = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    handleDateChange(d.toISOString().split('T')[0]);
  };

  const handleCellClick = async (cell) => {
    setIsFocusMode(true);
    setAiData({ prob: 0, status: 'ANALIZANDO...' });
    try {
      const pred = await getPrediction(cell.lat, cell.lon);
      setAiData({ prob: pred.probability, status: pred.probability > 75 ? 'CRÍTICO' : 'NORMAL' });
    } catch (err) { setAiData({ prob: 0, status: 'SIN CONEXIÓN' }); }
  };

  const flyToLocation = (lat, lon) => {
    if (lat && lon) {
      setActiveTab('Inicio');
      setMapCenter({ lat, lon });
      setIsFocusMode(true);
    }
  };

  const handleExitFocus = () => {
    setIsFocusMode(false);
  };

  const handleDownload = () => {
    let url = `http://127.0.0.1:8000/download?date=${date}`;
    if (bbox) {
      url += `&min_lat=${bbox.minLat}&max_lat=${bbox.maxLat}&min_lon=${bbox.minLon}&max_lon=${bbox.maxLon}`;
    }
    window.location.href = url;
  };

  const renderDashboard = () => (
    <div className="dashboard-grid">
      {/* MAPA */}
      <div className="map-wrapper">
        <MapErrorBoundary>
          <Map3D 
            date={date} 
            onCellClick={handleCellClick} 
            flyToCoords={mapCenter} 
            mapMode={mapMode} 
            onAreaSelect={setBbox}
            dataSource={dataSource}
            onExitFocus={handleExitFocus}
          />
        </MapErrorBoundary>
        
        <div className="map-top-controls">
          <button className={`map-btn ${mapMode === 'satellite' ? 'active' : ''}`} onClick={() => setMapMode('satellite')}>
            <MapPin size={12}/> Satelital
          </button>
          <button className={`map-btn ${mapMode === 'gis' ? 'active' : ''}`} onClick={() => setMapMode('gis')}>
            <MapIcon size={12}/> GIS
          </button>
          <button className={`map-btn ${mapMode === 'heatmap' ? 'active' : ''}`} onClick={() => setMapMode('heatmap')}>
            <Flame size={12}/> Calor
          </button>
        </div>

        <select 
          className="mini-select" 
          style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, background: 'rgba(7, 24, 43, 0.9)', padding: '4px', fontSize: '0.6rem' }}
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
        >
          <option value="Perú">Perú</option>
          <option value="Brasil">Brasil</option>
          <option value="Colombia">Colombia</option>
          <option value="Bolivia">Bolivia</option>
          <option value="Ecuador">Ecuador</option>
        </select>
      </div>

      {/* PANEL DERECHO */}
      <div className="right-panel">
        <div className="glass-panel">
          <div className="panel-header">
            <h3><ChartNoAxesCombined size={12}/> Ventana Temporal</h3>
            <select className="mini-select" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="7d">7 días</option>
              <option value="30d">30 días</option>
              <option value="1y">1 año</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={evolutionData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#718096', fontFamily: "'IBM Plex Mono', monospace" }} axisLine={false} tickLine={false} dy={6} />
              <YAxis tick={{ fontSize: 8, fill: '#718096', fontFamily: "'IBM Plex Mono', monospace" }} axisLine={false} tickLine={false} width={25} />
              <Tooltip contentStyle={{ background: 'rgba(7, 24, 43, 0.95)', border: '1px solid var(--cyan)', borderRadius: '8px' }} itemStyle={{ color: 'var(--cyan)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 'bold' }} labelStyle={{ color: '#fff', fontSize: '0.65rem' }} cursor={{ stroke: 'rgba(0, 217, 255, 0.3)', strokeWidth: 2, strokeDasharray: '4 4' }} />
              <Line type="monotone" dataKey="focos" name="Focos" stroke="var(--cyan)" strokeWidth={2} dot={{ r: 2, fill: 'var(--bg-main)', stroke: 'var(--cyan)', strokeWidth: 1.5 }} activeDot={{ r: 4, fill: 'var(--cyan)', stroke: '#fff', strokeWidth: 1.5, style: { filter: 'drop-shadow(0 0 8px var(--cyan))' } }} animationDuration={1500} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <h3><BarChart2 size={12}/> Comparación de Sensores</h3>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={sensorData} layout="vertical" margin={{ top: 0, right: 10, left: -5, bottom: 0 }}>
              <defs>
                <linearGradient id="colorModis" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#078BFF" stopOpacity={0.8}/><stop offset="100%" stopColor="#00D9FF" stopOpacity={1}/></linearGradient>
                <linearGradient id="colorViirs" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#FF5E00" stopOpacity={0.8}/><stop offset="100%" stopColor="#FF9700" stopOpacity={1}/></linearGradient>
              </defs>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fill: '#a0aec0', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 'bold' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: 'rgba(7, 24, 43, 0.95)', border: '1px solid var(--cyan)', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 'bold' }} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={12}>
                {sensorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'MODIS' ? 'url(#colorModis)' : entry.name === 'VIIRS' ? 'url(#colorViirs)' : entry.fill} style={{ filter: `drop-shadow(0px 0px 4px ${entry.fill}80)` }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <IAPredictionCard aiData={aiData} />
      </div>

      {/* PANEL INFERIOR */}
      <div className="bottom-panel">
        <div className="glass-panel" style={{ padding: '8px 8px 0 8px' }}>
          <div className="panel-header" style={{ marginBottom: '0px' }}>
            <h3><ChartNoAxesCombined size={12}/> Evolución Temporal</h3>
            <div className="legend-inline">
              <span><div className="dot" style={{ background: 'var(--orange)', boxShadow: '0 0 5px var(--orange)' }}></div> Focos</span>
              <span><div className="dot" style={{ background: 'var(--cyan)', boxShadow: '0 0 5px var(--cyan)' }}></div> Área (ha)</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '100px', marginTop: '2px' }}>
            <EvolutionChart data={evolutionData} />
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <h3><ChartPie size={12}/> Distribución por Región</h3>
          </div>
          <div style={{ flex: 1, minHeight: '90px' }}>
            <RegionDonutChart data={regionData} />
          </div>
        </div>

        <div className="glass-panel">
          <RecentEvents events={recentEvents} onEventClick={flyToLocation} />
        </div>
      </div>
    </div>
  );

  const renderFocusExitButton = () => {
    if (!isFocusMode) return null;
    return (
      <button 
        onClick={() => setIsFocusMode(false)}
        style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
          background: 'rgba(255, 48, 77, 0.9)', color: '#fff',
          border: 'none', padding: '10px 20px', borderRadius: '30px',
          cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold',
          boxShadow: '0 0 20px rgba(255, 48, 77, 0.5)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}
      >
        <X size={16} /> SALIR DEL FOCO
      </button>
    );
  };

  return (
    <div className={`app-container ${isFocusMode ? 'focus-mode' : ''}`}>
      {renderFocusExitButton()}

      <aside className="sidebar">
        <div className="logo">
          <img src="/logo.png" alt="Prometeo-9 Logo" className="logo-img" />
          <div>
            <h1>PROMETEO-9</h1>
            <span>FIRMS // LANCE</span>
          </div>
        </div>
        
        <nav className="nav-menu">
          {[
            { id: 'Inicio', icon: LayoutDashboard }, 
            { id: 'Mapa', icon: Map }, 
            { id: 'Reportes', icon: FileText }, 
            { id: 'Analytics', icon: BarChart2 }
          ].map(item => (
            <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
              <item.icon size={16} /> <span>{item.id}</span>
            </button>
          ))}
        </nav>

        {/* TARJETA DE ANOMALÍA AQUÍ EN EL SIDEBAR */}
        <div style={{ padding: '0 4px' }}>
          <AnomalyCard data={anomalyData} />
        </div>

        <div style={{ flex: 1 }}></div> {/* Espaciador para empujar el resto abajo */}

        <div className="sidebar-date-panel">
          <h4 style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '1px' }}>📅 FECHA</h4>
          <DateInput date={date} onChange={handleDateChange} />
          <div className="date-controls-row">
            <button className="date-nav-btn" onClick={() => changeDateBy(-1)} title="Día anterior"><ChevronLeft size={14} /></button>
            <button className={`date-play-btn ${isPlaying ? 'playing' : ''}`} onClick={() => setIsPlaying(!isPlaying)} title={isPlaying ? "Pausar" : "Play"}>
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button className="date-nav-btn" onClick={() => changeDateBy(1)} title="Día siguiente"><ChevronRight size={14} /></button>
          </div>
          
          <button onClick={handleDownload} style={{ width: '100%', marginTop: '6px', background: 'rgba(0, 217, 255, 0.1)', border: '1px solid var(--cyan)', color: 'var(--cyan)', padding: '5px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>
            <FileText size={10} /> DESCARGAR CSV {bbox ? '(ÁREA)' : ''}
          </button>
        </div>

        <div className="satellite-status">
          <Satellite size={14} color="#00D68F" />
          <div><strong>Satélite</strong><span>● En línea</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="header tech-header">
          <div className="header-metrics">
            <div className="metric-card">
              <Flame color="#FF304D" size={16} />
              <div><span>FOCOS ACTIVOS</span><strong className="font-mono">{metrics.total.toLocaleString()}</strong></div>
            </div>
            <div className="metric-card">
              <AlertTriangle color="#FF9700" size={16} />
              <div><span>FRP TOTAL</span><strong className="font-mono">{Math.round(metrics.frp).toLocaleString()} MW</strong></div>
            </div>
            <div className="metric-card">
              <Bell color="#FF304D" size={16} />
              <div><span>ALERTAS</span><strong className="font-mono">{metrics.alerts}</strong></div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="api-badge"><span className="pulse-dot"></span> API LIVE</div>
            <div className="utc-clock font-mono"><Clock size={12} /> {utcTime} UTC</div>
            <select className="date-input" value={dataSource} onChange={(e) => setDataSource(e.target.value)} style={{ height: '26px', fontSize: '0.65rem' }}>
              <option value="harmonized">MODIS + VIIRS</option>
              <option value="modis">MODIS</option>
              <option value="viirs">VIIRS</option>
            </select>
          </div>
        </header>

        {activeTab === 'Inicio' && renderDashboard()}
        {activeTab === 'Mapa' && <MapaView date={date} handleCellClick={handleCellClick} />}
        {activeTab === 'Reportes' && <ReportesView date={date} />}
        {activeTab === 'Analytics' && <AnalyticsView onFlyToLocation={flyToLocation} />}
      </main>
    </div>
  );
}