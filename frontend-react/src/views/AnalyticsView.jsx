import React, { useState, useEffect } from 'react';
import { getCalendar, getDailyCalendar, getCellsByDate } from '../services/api';
import { Calendar, Download, ChevronLeft, Activity, FileText, AlertTriangle, MapPin, BarChart3, Map } from 'lucide-react';
import './AnalyticsView.css';

const REGIONS = [
  { name: 'Perú', minLat: -18.5, maxLat: -0.0, minLon: -81.5, maxLon: -68.5 },
  { name: 'Brasil', minLat: -33.7, maxLat: 5.3, minLon: -74.0, maxLon: -34.7 },
  { name: 'Colombia', minLat: -4.2, maxLat: 12.5, minLon: -79.0, maxLon: -66.8 },
  { name: 'Bolivia', minLat: -22.9, maxLat: -9.6, minLon: -69.6, maxLon: -57.4 },
  { name: 'Ecuador', minLat: -5.0, maxLat: 1.4, minLon: -81.0, maxLon: -75.1 },
];

const getRegionFromCoords = (lat, lon) => {
  const region = REGIONS.find(r => lat >= r.minLat && lat <= r.maxLat && lon >= r.minLon && lon <= r.maxLon);
  return region ? region.name : 'Océano / Otro';
};

export default function AnalyticsView({ onFlyToLocation }) {
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('year'); 
  const [selectedMonth, setSelectedMonth] = useState(null);
  
  const [dailyData, setDailyData] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  
  const [topRegion, setTopRegion] = useState({ name: 'Calculando...', percentage: 0, center: null });

  useEffect(() => {
    getCalendar()
      .then(data => setCalendarData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const years = [...new Set(calendarData.map(d => d.year))].sort();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const maxTotal = Math.max(...calendarData.map(d => d.total), 1);

  const getColorData = (total) => {
    if (total <= 0) return { bg: '#14283C', border: '#29435C', glow: 'transparent' };
    if (total <= 20000) return { bg: '#0879D8', border: '#249AFF', glow: 'rgba(8,121,216,.5)' };
    if (total <= 40000) return { bg: '#00AFC9', border: '#00D9EF', glow: 'rgba(0,217,239,.5)' };
    if (total <= 60000) return { bg: '#D6AC00', border: '#FFDC28', glow: 'rgba(255,220,40,.5)' };
    if (total <= 80000) return { bg: '#E87800', border: '#FF9C25', glow: 'rgba(255,151,0,.5)' };
    return { bg: '#D91F42', border: '#FF4967', glow: 'rgba(255,48,77,.6)' };
  };

  const calculateTopRegion = async (year, month) => {
    try {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-15`;
      const cells = await getCellsByDate(dateStr);
      
      if (!cells || cells.length === 0) {
        setTopRegion({ name: 'Sin datos', percentage: 0, center: null });
        return;
      }

      const regionCount = {};
      let totalFires = 0;
      let highestFireCell = cells[0];

      cells.forEach(cell => {
        const region = getRegionFromCoords(cell.lat, cell.lon);
        regionCount[region] = (regionCount[region] || 0) + cell.total;
        totalFires += cell.total;
      });

      let topReg = 'Océano / Otro';
      let topCount = 0;
      for (const [reg, count] of Object.entries(regionCount)) {
        if (count > topCount) {
          topCount = count;
          topReg = reg;
        }
      }

      const percentage = Math.round((topCount / totalFires) * 100);
      const center = { lat: highestFireCell.lat, lon: highestFireCell.lon };

      setTopRegion({ name: topReg, percentage, center });
    } catch (error) {
      console.error("Error calculando región:", error);
      setTopRegion({ name: 'Error', percentage: 0, center: null });
    }
  };

  const loadMonthData = async (year, month) => {
    setDailyLoading(true);
    try {
      const data = await getDailyCalendar(year, month);
      setDailyData(data);
      calculateTopRegion(year, month);
    } catch (error) {
      console.error('Error cargando los datos diarios:', error);
      setDailyData([]);
    } finally {
      setDailyLoading(false);
    }
  };

  const renderMonthView = () => {
    if (!selectedMonth) return null;
    const { year, month } = selectedMonth;

    const daysInMonth = new Date(year, month, 0).getDate();
    const fullMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNumber = i + 1;
      const realData = dailyData.find(d => d.day === dayNumber);
      return { day: dayNumber, total: realData ? realData.total : 0 };
    });

    const monthTotal = fullMonthDays.reduce((sum, day) => sum + Number(day.total || 0), 0);
    const highestDay = fullMonthDays.reduce((max, day) => Number(day.total) > Number(max?.total || 0) ? day : max, null);
    
    const firstDay = new Date(year, month - 1, 1).getDay();
    const emptyDays = firstDay === 0 ? 6 : firstDay - 1;

    return (
      <div className="month-view">
        <div className="month-header">
          <button onClick={() => { setViewMode('year'); setDailyData([]); setSelectedMonth(null); }} className="month-button" style={{ justifySelf: 'start' }}>
            <ChevronLeft size={18} /> Volver al Histórico
          </button>
          
          <div className="month-title">
            <h2>Detalle de {months[month - 1]} {year}</h2>
            <p>Detecciones totales por día</p>
          </div>

          <button 
            onClick={() => window.location.href = `http://127.0.0.1:8000/download?date=${year}-${month.toString().padStart(2, '0')}-01`}
            className="month-button"
            style={{ justifySelf: 'end' }}
          >
            <Download size={16} /> Descargar Mes
          </button>
        </div>

        <div className="month-stats">
          <div className="stat-card">
            <div className="stat-icon"><BarChart3 size={28} /></div>
            <div>
              <p className="stat-label">Total del Mes</p>
              <div>
                <span className="stat-value">{monthTotal.toLocaleString('es-PE')}</span>
                <span className="stat-description">detecciones</span>
              </div>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon"><AlertTriangle size={28} /></div>
            <div>
              <p className="stat-label">Día con más alertas</p>
              <div>
                <span className="stat-value">
                  {highestDay ? `Día ${highestDay.day}` : 'N/A'}
                </span>
                <span className="stat-description">
                  {highestDay ? `(${Number(highestDay.total).toLocaleString('es-PE')} focos)` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card success" style={{ cursor: topRegion.center ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }}>
            <div className="stat-icon"><MapPin size={28} /></div>
            <div style={{ flex: 1 }}>
              <p className="stat-label">Región más afectada</p>
              <div>
                <span className="stat-value">{topRegion.name}</span>
                <span className="stat-description">({topRegion.percentage}% del total)</span>
              </div>
            </div>
            
            {topRegion.center && (
              <button 
                onClick={() => onFlyToLocation(topRegion.center.lat, topRegion.center.lon)}
                style={{
                  background: 'var(--green)', color: '#000', border: 'none',
                  padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold',
                  fontSize: '0.75rem', transition: 'all 0.2s', zIndex: 2
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 15px var(--green)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Map size={14} /> Ir al Mapa
              </button>
            )}
          </div>
        </div>

        <div className="month-calendar">
          <div className="calendar-heading">
            <h3><Calendar size={20} /> Calendario de {months[month - 1]} {year}</h3>
            <div className="calendar-legend">
              <span className="legend-item"><div className="legend-color" style={{ color: '#0879D8' }}></div> ≤ 20K</span>
              <span className="legend-item"><div className="legend-color" style={{ color: '#00AFC9' }}></div> 20K - 40K</span>
              <span className="legend-item"><div className="legend-color" style={{ color: '#D6AC00' }}></div> 40K - 60K</span>
              <span className="legend-item"><div className="legend-color" style={{ color: '#E87800' }}></div> 60K - 80K</span>
              <span className="legend-item"><div className="legend-color" style={{ color: '#D91F42' }}></div> &gt; 80K</span>
            </div>
          </div>

          <div className="weekdays">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>

          <div className="calendar-days">
            {Array.from({ length: emptyDays }).map((_, i) => (
              <div key={`empty-${i}`}></div>
            ))}

            {dailyLoading && (
              <div style={{ gridColumn: 'span 7', textAlign: 'center', padding: '20px', color: 'var(--cyan)' }}>
                Cargando datos del mes...
              </div>
            )}

            {!dailyLoading && fullMonthDays.map((d) => {
              const colorData = getColorData(d.total);
              return (
                <button
                  key={d.day}
                  className={`day-cell ${highestDay?.day === d.day ? 'critical' : ''}`}
                  style={{
                    '--day-color': colorData.bg,
                    '--day-border': colorData.border,
                    '--day-glow': colorData.glow
                  }}
                  title={`Día ${d.day}: ${Number(d.total).toLocaleString('es-PE')} focos`}
                >
                  <span className="day-number">{d.day}</span>
                  <span className="day-total">{Number(d.total).toLocaleString('es-PE')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '20px', color: 'var(--cyan)' }}>Cargando análisis histórico...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, padding: '20px', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Activity size={32} color="var(--cyan)" />
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#fff', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '1px' }}>
          Analíticas <span style={{ color: 'var(--cyan)' }}>Avanzadas</span>
        </h1>
      </div>

      {viewMode === 'year' ? (
        <>
          <div className="glass-panel" style={{ padding: '24px', flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'var(--blue)', padding: '10px', borderRadius: '12px' }}><Calendar size={24} color="#fff" /></div>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.2rem' }}>Calendario de Quemas (Histórico)</h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>Intensidad de detecciones por mes y año.</p>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(12, 1fr)', gap: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', minWidth: '900px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>Año</div>
              {months.map((m, i) => (
                <div key={m} style={{ textAlign: 'center', color: 'var(--cyan)', fontWeight: 'bold', paddingBottom: '10px' }}>{m}</div>
              ))}
              
              {years.map(year => (
                <React.Fragment key={year}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>{year}</div>
                  {months.map((m, i) => {
                    const monthData = calendarData.find(d => d.year === year && d.month === (i + 1));
                    const total = monthData ? monthData.total : 0;
                    const colorData = getColorData(total);
                    return (
                      <div 
                        key={`${year}-${i}`} 
                        onClick={() => { setSelectedMonth({ year, month: i + 1 }); setViewMode('month'); loadMonthData(year, i + 1); }}
                        style={{ height: '40px', background: colorData.bg, borderRadius: '8px', cursor: 'pointer', border: `1px solid ${colorData.border}`, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', color: total > maxTotal * 0.5 ? '#000' : '#fff', fontSize: '0.7rem', fontWeight: 'bold', position: 'relative', zIndex: 1 }}
                        title={`${year} - ${m}: ${total.toLocaleString()} detecciones`}
                        onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; e.target.style.zIndex = '10'; e.target.style.boxShadow = `0 0 15px ${colorData.bg}`; }}
                        onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.zIndex = '1'; e.target.style.boxShadow = 'none'; }}
                      >
                        {total > 0 ? total.toLocaleString() : ''}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="export-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: '#00D9FF', padding: '10px', borderRadius: '12px' }}><FileText size={24} color="#000" /></div>
              <div>
                <h2 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.1rem' }}>Exportar Datos Históricos</h2>
                <p style={{ color: '#8da8c2', fontSize: '0.85rem', margin: 0 }}>Descarga el histórico completo en formato CSV.</p>
              </div>
            </div>
            <button className="export-button" onClick={() => window.location.href = `http://127.0.0.1:8000/download/all`}>
              <Download size={20} style={{ marginRight: '8px' }} /> Descargar Todo el Histórico
            </button>
          </div>
        </>
      ) : (
        renderMonthView()
      )}
    </div>
  );
}