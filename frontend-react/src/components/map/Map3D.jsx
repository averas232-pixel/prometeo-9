import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

maplibregl.setWorkerUrl(workerUrl);

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const STYLE_URL = `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`;

const Map3D = ({ date, onCellClick }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const clickRef = useRef(onCellClick);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => { clickRef.current = onCellClick; }, [onCellClick]);

  useEffect(() => {
    if (!MAPTILER_KEY) {
      console.error('Falta VITE_MAPTILER_KEY en el archivo .env');
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [-75, -9],
      zoom: 4.5,
      pitch: 45,
      bearing: 0,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    map.on('load', () => setMapLoaded(true));
    map.on('error', (e) => console.error('[MapLibre]', e.error ?? e));
    map.on('click', (e) => clickRef.current?.({ lat: e.lngLat.lat, lon: e.lngLat.lng }));

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {!mapLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                      color: '#9FB3CC', pointerEvents: 'none', fontSize: 13 }}>
          Cargando mapa…
        </div>
      )}
    </div>
  );
};

export default Map3D;