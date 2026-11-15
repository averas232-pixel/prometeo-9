import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import TacticalRadar from './TacticalRadar';

maplibregl.setWorkerUrl(workerUrl);

// Parche de clases para que MapboxDraw funcione con MapLibre
Object.assign(MapboxDraw.constants.classes, {
  CANVAS: 'maplibregl-canvas',
  CONTROL_BASE: 'maplibregl-ctrl',
  CONTROL_PREFIX: 'maplibregl-ctrl-',
  CONTROL_GROUP: 'maplibregl-ctrl-group',
  ATTRIBUTION: 'maplibregl-ctrl-attrib',
});

const DRAW_STYLES = [
  { id: 'gl-draw-polygon-fill', type: 'fill', filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']], paint: { 'fill-color': '#FF9700', 'fill-opacity': 0.15 } },
  { id: 'gl-draw-polygon-stroke', type: 'line', filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FF9700', 'line-width': 2.5 } },
  { id: 'gl-draw-line', type: 'line', filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FF9700', 'line-width': 2.5 } },
  { id: 'gl-draw-midpoint', type: 'circle', filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']], paint: { 'circle-radius': 3, 'circle-color': '#FF9700' } },
  { id: 'gl-draw-vertex-halo', type: 'circle', filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['!=', 'mode', 'static']], paint: { 'circle-radius': 6, 'circle-color': '#FFFFFF' } },
  { id: 'gl-draw-vertex', type: 'circle', filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['!=', 'mode', 'static']], paint: { 'circle-radius': 4, 'circle-color': '#FF304D' } },
];

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const STYLE_SATELLITE = `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`;
const STYLE_GIS = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;
const API_URL = 'http://127.0.0.1:8000';
const EMPTY = { type: 'FeatureCollection', features: [] };

const bboxToPolygon = (b) => (b ? {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[
    [b.minLon, b.minLat], [b.maxLon, b.minLat], [b.maxLon, b.maxLat], [b.minLon, b.maxLat], [b.minLon, b.minLat],
  ]] } }],
} : EMPTY);

function applyData(map, st) {
  if (!map.getSource('fires')) map.addSource('fires', { type: 'geojson', data: EMPTY });
  if (!map.getLayer('fires-heat')) {
    map.addLayer({
      id: 'fires-heat', type: 'heatmap', source: 'fires', maxzoom: 9,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'total'], 1, 0.1, 30, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, 'rgba(0,213,242,0.2)', 0.4, 'rgba(255,157,0,0.6)', 0.7, 'rgba(255,53,77,0.9)', 1, 'rgba(255,255,255,1)'],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 30],
        'heatmap-opacity': 0.8,
      },
    });
  }
  if (!map.getLayer('fires-points')) {
    map.addLayer({
      id: 'fires-points', type: 'circle', source: 'fires',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'total'], 1, 3, 10, 6, 50, 12, 100, 18],
        'circle-color': ['interpolate', ['linear'], ['get', 'total'], 1, '#ffcc00', 15, '#ff7b00', 50, '#ff0000'],
        'circle-blur': 0.8, 'circle-opacity': 0.9, 'circle-stroke-width': 0.5, 'circle-stroke-color': '#ffffff', 'circle-stroke-opacity': 0.3,
      },
    });
  }
  if (!map.getSource('aoi')) map.addSource('aoi', { type: 'geojson', data: EMPTY });
  if (!map.getLayer('aoi-line')) {
    map.addLayer({ id: 'aoi-line', type: 'line', source: 'aoi', paint: { 'line-color': '#FF9700', 'line-width': 2 } });
  }
  map.getSource('fires').setData(st.geojson);
  map.getSource('aoi').setData(bboxToPolygon(st.bbox));
  map.setLayoutProperty('fires-points', 'visibility', st.mode === 'heatmap' ? 'none' : 'visible');
  map.setLayoutProperty('fires-heat', 'visibility', 'visible');
}

const sync = (map, st) => {
  if (!map) return;
  try { applyData(map, st); } catch { /* el estilo aún carga; se reintenta en style.load */ }
};

const Map3D = ({ date, onCellClick, flyToCoords, mapMode, onAreaSelect, dataSource, onExitFocus }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const styleRef = useRef(mapMode === 'gis' ? 'gis' : 'satellite');
  const stateRef = useRef({ geojson: EMPTY, bbox: null, mode: mapMode });
  const cbRef = useRef({ onCellClick, onAreaSelect, onExitFocus });
  const drawingRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [bbox, setBbox] = useState(null);
  const [mapFires, setMapFires] = useState([]);
  const [mouseCoords, setMouseCoords] = useState({ lat: 0, lon: 0 });

  useEffect(() => {
    cbRef.current = { onCellClick, onAreaSelect, onExitFocus };
    drawingRef.current = isDrawing;
    stateRef.current.mode = mapMode;
    stateRef.current.bbox = bbox;
  }, [onCellClick, onAreaSelect, onExitFocus, isDrawing, mapMode, bbox]);

  useEffect(() => {
    if (!MAPTILER_KEY) { console.error('Falta VITE_MAPTILER_KEY en .env'); return; }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleRef.current === 'gis' ? STYLE_GIS : STYLE_SATELLITE,
      center: [-75, -9],
      zoom: 4.5,
      pitch: 45,
      minZoom: 2.5,
      renderWorldCopies: false,
    });
    mapRef.current = map;
    window.__map = map; 

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    map.on('error', (e) => console.error('[MapLibre]', e.error ?? e));
    map.on('style.load', () => sync(map, stateRef.current));

    map.on('mousemove', (e) => {
      setMouseCoords({ lat: e.lngLat.lat.toFixed(4), lon: e.lngLat.lng.toFixed(4) });
    });

    map.on('click', (e) => {
      if (drawingRef.current) return;
      const hit = map.getLayer('fires-points') ? map.queryRenderedFeatures(e.point, { layers: ['fires-points'] })[0] : null;
      
      if (hit) {
        const coords = hit.geometry.coordinates;
        cbRef.current.onCellClick?.({ lat: coords[1], lon: coords[0] });
      } else {
        if (cbRef.current.onExitFocus) {
          cbRef.current.onExitFocus();
        }
      }
    });

    map.once('load', () => {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        defaultMode: 'simple_select',
        styles: DRAW_STYLES,
      });
      map.addControl(draw);
      drawRef.current = draw;

      const onDraw = (e) => {
        const ring = e.features?.[0]?.geometry?.coordinates?.[0];
        if (!ring) return;
        const lons = ring.map((p) => p[0]);
        const lats = ring.map((p) => p[1]);
        const nb = { minLon: Math.min(...lons), maxLon: Math.max(...lons), minLat: Math.min(...lats), maxLat: Math.max(...lats) };
        setTimeout(() => { draw.deleteAll(); setIsDrawing(false); }, 0);
        setBbox(nb);
        cbRef.current.onAreaSelect?.(nb);
      };
      map.on('draw.create', onDraw);
      map.on('draw.update', onDraw);

      sync(map, stateRef.current);
      setReady(true);
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current?.offsetWidth > 0) { try { map.resize(); } catch { } }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!ready || !date) return;
    const ac = new AbortController();
    let url = `${API_URL}/cells?date=${date}&min_conf=3`;
    if (bbox) url += `&min_lat=${bbox.minLat}&max_lat=${bbox.maxLat}&min_lon=${bbox.minLon}&max_lon=${bbox.maxLon}`;
    
    fetch(url, { signal: ac.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((cells) => {
        let filteredCells = cells;
        if (dataSource === 'modis') filteredCells = cells.filter(c => c.modis > 0);
        if (dataSource === 'viirs') filteredCells = cells.filter(c => c.viirs > 0);

        stateRef.current.geojson = {
          type: 'FeatureCollection',
          features: filteredCells.map((c) => ({
            type: 'Feature', geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
            properties: { total: c.total, modis: c.modis, viirs: c.viirs, frp: c.frp },
          })),
        };
        sync(mapRef.current, stateRef.current);
        setMapFires(filteredCells.map(c => ({ lat: c.lat, lon: c.lon, total: c.total })));
      })
      .catch((e) => { if (e.name !== 'AbortError') console.error('Error cargando fuegos:', e); });

    return () => ac.abort();
  }, [date, bbox, ready, dataSource]);

  useEffect(() => { if (ready) sync(mapRef.current, stateRef.current); }, [mapMode, bbox, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const want = mapMode === 'gis' ? 'gis' : 'satellite';
    if (styleRef.current !== want) {
      styleRef.current = want;
      map.setStyle(want === 'gis' ? STYLE_GIS : STYLE_SATELLITE, { diff: false });
    }
  }, [mapMode, ready]);

  useEffect(() => {
    if (mapRef.current && flyToCoords) {
      mapRef.current.flyTo({ center: [flyToCoords.lon, flyToCoords.lat], zoom: 10, pitch: 60, duration: 2500, essential: true });
    }
  }, [flyToCoords]);

  useEffect(() => {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!ready || !draw || !map) return;
    draw.changeMode(isDrawing ? 'draw_polygon' : 'simple_select');
    map.getCanvas().style.cursor = isDrawing ? 'crosshair' : '';
  }, [isDrawing, ready]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      <div style={{ position: 'absolute', top: '110px', left: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {!bbox && (
          <button
            onClick={() => setIsDrawing((d) => !d)}
            style={{ background: isDrawing ? 'rgba(255, 48, 77, 0.9)' : 'rgba(7, 24, 43, 0.9)', color: isDrawing ? '#fff' : 'var(--cyan)', border: `1px solid ${isDrawing ? 'var(--red)' : 'var(--cyan)'}`, padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 'bold', boxShadow: isDrawing ? '0 0 20px rgba(255, 48, 77, 0.4)' : '0 4px 10px rgba(0,0,0,0.5)', transition: 'all 0.3s ease' }}
          >
            {isDrawing ? <><div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite' }} /> CANCELAR</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> DIBUJAR ÁREA</>}
          </button>
        )}
        {bbox && (
          <button
            onClick={() => { setBbox(null); cbRef.current.onAreaSelect?.(null); }}
            style={{ background: 'rgba(255, 48, 77, 0.15)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', transition: 'all 0.3s ease' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> BORRAR ÁREA
          </button>
        )}
      </div>

      {isDrawing && (
        <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'rgba(7, 24, 43, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid var(--orange)', borderRadius: '30px', boxShadow: '0 8px 32px rgba(255, 151, 0, 0.15)', color: '#fff', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', pointerEvents: 'none' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--orange)', boxShadow: '0 0 10px var(--orange)', animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: 'var(--text-dim)' }}>MODO DIBUJO:</span>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--cyan)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ color: 'var(--orange)', fontWeight: 'bold' }}>1.</span> Clic para puntos</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ color: 'var(--orange)', fontWeight: 'bold' }}>2.</span> Doble clic para cerrar</span>
          </div>
        </div>
      )}

      {/* AVISO DE FILTRO ACTIVO */}
      {bbox && (
        <div style={{ 
          position: 'absolute', top: '60px', left: '50%', transform: 'translateX(-50%)', 
          zIndex: 1000, background: 'rgba(255, 151, 0, 0.15)', backdropFilter: 'blur(8px)',
          padding: '6px 16px', borderRadius: '20px', border: '1px solid var(--orange)',
          color: 'var(--orange)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem',
          display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 15px rgba(255, 151, 0, 0.2)'
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', animation: 'pulse 1.5s infinite' }} />
          MOSTRANDO SOLO DATOS DEL ÁREA SELECCIONADA
        </div>
      )}

      <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(7, 24, 43, 0.85)', padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--cyan)', display: 'flex', gap: '15px' }}>
        <span>LAT: {mouseCoords.lat}</span>
        <span>LON: {mouseCoords.lon}</span>
      </div>

      <TacticalRadar fires={mapFires} />

      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#9FB3CC', pointerEvents: 'none', fontSize: 13 }}>
          Cargando mapa…
        </div>
      )}

      <style>{`@keyframes pulse { 0% { transform: scale(0.95); opacity: 0.8; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.8; } }`}</style>
    </div>
  );
};

export default Map3D;