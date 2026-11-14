const API = "http://127.0.0.1:8000"; 
let currentLayer = null, cmpChart = null, tsChart = null;
let validDates = [], isPlaying = false, playInterval = null, splitActive = false;
let mapRight = null, mapLeft = null;
let currentBaseMap = 'esri';
let currentLayerType = 'heat';
let currentBounds = null; 
let drawnItems = null;
let cellsAbortController = null; 

Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.color = "#94A8BE";
Chart.defaults.font.size = 10;

const esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const getGibsUrl = (date) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

const map = L.map('map', { 
  zoomControl: false, 
  maxZoom: 9, 
  minZoom: 4, 
  maxBounds: [[-90, -180], [90, 180]],
  maxBoundsViscosity: 1.0
}).setView([-12, -60], 4); 

let baseLayer = L.tileLayer(esriUrl, { attribution: 'Tiles &copy; Esri' }).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// --- HERRAMIENTAS DE DIBUJO ---
drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
    position: 'topleft',
    edit: { featureGroup: drawnItems },
    draw: { polygon: false, circle: false, marker: false, circlemarker: false, polyline: false, rectangle: true }
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (e) {
    const layer = e.layer;
    drawnItems.clearLayers();
    drawnItems.addLayer(layer);
    currentBounds = layer.getBounds();
    loadCells(); 
});

// --- RELOJ Y TELEMETRÍA ---
setInterval(() => {
  const now = new Date();
  document.getElementById('utc-date').innerText = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  document.getElementById('utc-clock').innerText = now.toLocaleTimeString('en-US', { hour12: false }) + ' UTC';
}, 1000);

map.on('mousemove', (e) => {
  document.getElementById('cursor-coords').innerText = `LAT ${e.latlng.lat.toFixed(3)} | LON ${e.latlng.lng.toFixed(3)}`;
});

function toggleBaseMap() {
  const btn = document.getElementById('btn-base-map');
  const date = document.getElementById('date').value;
  
  if(currentBaseMap === 'esri') {
    map.removeLayer(baseLayer);
    baseLayer = L.tileLayer(getGibsUrl(date), { attribution: 'NASA GIBS' }).addTo(map);
    currentBaseMap = 'gibs'; btn.innerText = "CAPA: NASA GIBS";
  } else {
    map.removeLayer(baseLayer);
    baseLayer = L.tileLayer(esriUrl, { attribution: 'Tiles &copy; Esri' }).addTo(map);
    currentBaseMap = 'esri'; btn.innerText = "CAPA: ESRI";
  }
}

function toggleLayerType() {
  const btn = document.getElementById('btn-layer-type');
  currentLayerType = currentLayerType === 'heat' ? 'pixels' : 'heat';
  btn.innerText = currentLayerType === 'heat' ? "MODO: CALOR" : "MODO: PÍXELES";
  loadCells(); 
}

function downloadCSV() {
  const date = document.getElementById('date').value;
  if(!date) return;
  window.location.href = `${API}/download?date=${date}`;
}

async function init() {
  try {
    const s = await (await fetch(`${API}/stats`)).json();
    document.getElementById('metrics-container').innerHTML = `
      <div class="metric"><span>SESGO V/M</span><span style="color:var(--accent-amber)">${s.ratio_prom}x</span></div>
      <div class="metric"><span>MODIS</span><span>${s.conf_modis.toLocaleString()}</span></div>
      <div class="metric"><span>VIIRS</span><span>${s.conf_viirs.toLocaleString()}</span></div>`;
  } catch(e) {
    document.getElementById('metrics-container').innerHTML = `<span class="status-text" style="color:var(--status-critical)">OFFLINE</span>`;
  }

  try {
    let allDates = await (await fetch(`${API}/dates`)).json();
    validDates = allDates.filter(d => d >= "2019-08-01");
    if (validDates.length === 0) validDates = allDates;
    
    const dateInput = document.getElementById('date');
    if(validDates.length > 0) {
        dateInput.min = validDates[0]; dateInput.max = validDates[validDates.length - 1];
        dateInput.value = validDates.find(d => d >= "2019-08-25") || validDates[0];
    }
    loadCells();
  } catch(e) {
    console.error("Error cargando fechas", e);
  }
}

function stepDate(dir) {
  const dateInput = document.getElementById('date');
  const currentDate = dateInput.value;
  if(dir > 0) { const next = validDates.find(d => d > currentDate); if(next) dateInput.value = next; }
  else { const prev = [...validDates].reverse().find(d => d < currentDate); if(prev) dateInput.value = prev; }
  loadCells();
}

function togglePlay() {
  if(validDates.length === 0) return;
  isPlaying = !isPlaying;
  const btn = document.getElementById('btn-play');
  const dateInput = document.getElementById('date');
  
  if(isPlaying){
    btn.innerText = "⏸ PAUSAR SECUENCIA"; btn.style.background = "var(--bg-elevated)"; btn.style.color = "var(--accent-amber)";
    playInterval = setInterval(() => {
      const currentIdx = validDates.indexOf(dateInput.value);
      let nextIdx = currentIdx + 1; if(nextIdx >= validDates.length) nextIdx = 0;
      dateInput.value = validDates[nextIdx]; loadCells();
    }, 900);
  } else {
    btn.innerText = "▶ REPRODUCIR SECUENCIA"; btn.style.background = "var(--accent-amber)"; btn.style.color = "#000";
    clearInterval(playInterval);
  }
}

async function loadCells() {
  const date = document.getElementById('date').value;
  const minc = document.getElementById('minconf').value;
  if(!date) return;
  
  if(splitActive) closeSplitView(); 
  if (currentLayer) { map.removeLayer(currentLayer); currentLayer = null; }

  if (cellsAbortController) cellsAbortController.abort();
  cellsAbortController = new AbortController();
  
  try {
    let url = `${API}/cells?date=${date}&min_conf=${minc}`;
    if (currentBounds) {
        url += `&min_lat=${currentBounds.getSouth()}&max_lat=${currentBounds.getNorth()}&min_lon=${currentBounds.getWest()}&max_lon=${currentBounds.getEast()}`;
    }

    const res = await fetch(url, { signal: cellsAbortController.signal });
    const cells = await res.json();
    
    document.getElementById('cmp-empty').classList.add('hidden');
    
    if (cells.length === 0) {
      currentLayer = L.layerGroup().addTo(map);
      document.getElementById('cmp-empty').classList.remove('hidden');
      document.getElementById('cmp-empty').innerText = "Sin detecciones para esta fecha/área";
      return;
    }

    if (!currentBounds) {
        let maxFire = cells[0]; 
        map.flyTo([maxFire.lat, maxFire.lon], 5, { duration: 1.5 });
    }

    if(currentLayerType === 'heat') {
      // Ajustamos la intensidad del calor al máximo
      const heatData = cells.map(c => [c.lat, c.lon, Math.min(c.total, 10)]);
      
      const heatLayer = L.heatLayer(heatData, { 
          radius: 40, 
          blur: 30, 
          maxZoom: 9, 
          max: 10.0, // <--- ESTO ES LA CLAVE
          minOpacity: 0.6,
          gradient: {0.2: '#0000FF', 0.4: '#00FFFF', 0.6: '#00FF00', 0.8: '#FFFF00', 1.0: '#FF0000'}
      });
      
      const clickLayer = L.layerGroup();
      cells.forEach(c => {
        let intensity = c.total;
        let colorClass, title, reco;

        if (intensity > 15) {
            colorClass = 'alert-rojo'; title = '🔥 CRÍTICO'; 
            reco = 'Peligro extremo. Evacuación inmediata de la zona.';
        } else if (intensity > 5) {
            colorClass = 'alert-naranja'; title = '⚠️ ALTO'; 
            reco = 'Fuego activo. Manténgase alerta.';
        } else {
            colorClass = 'alert-amarillo'; title = '👀 MODERADO'; 
            reco = 'Foco incipiente. Monitorear evolución.';
        }

        const popupHTML = `
            <div class="fire-popup">
                <h4>${title}</h4>
                <p>Detecciones: <b>${intensity}</b> (M:${c.modis} / V:${c.viirs})</p>
                <div class="recommendation ${colorClass}">${reco}</div>
            </div>
        `;

        L.circleMarker([c.lat, c.lon], { radius: 12, fillOpacity: 0, stroke: false })
        .bindPopup(popupHTML, { className: 'fire-popup' })
        .on('click', () => loadTimeseries(c.lat, c.lon))
        .addTo(clickLayer);
      });
      currentLayer = L.layerGroup([heatLayer, clickLayer]).addTo(map);
      
    } else {
      // MODO PÍXELES (Este siempre se ha visto bien)
      const pixelLayer = L.layerGroup();
      cells.forEach(c => {
        let fillColor = c.total > 8 ? '#ff3333' : (c.total > 4 ? '#ff8c00' : '#ffff00');
        let borderColor = c.total > 4 ? '#ff0000' : '#ffa500';
        L.rectangle([[c.lat - 0.125, c.lon - 0.125], [c.lat + 0.125, c.lon + 0.125]], { color: borderColor, weight: 0.5, fillColor: fillColor, fillOpacity: 0.85 })
        .bindTooltip(`<div style="color:var(--text-secondary); font-size:10px; margin-bottom:4px">FECHA: ${date}</div><div>MODIS: <b style="color:var(--accent-amber)">${c.modis}</b> | VIIRS: <b style="color:#A77BF3">${c.viirs}</b></div>`, {className: 'leaflet-tooltip-custom', sticky: true})
        .on('click', () => loadTimeseries(c.lat, c.lon))
        .addTo(pixelLayer);
      });
      currentLayer = pixelLayer.addTo(map);
    }

    const cmp = await (await fetch(`${API}/compare?date=${date}`)).json();
    const cmpData = [cmp.modis, cmp.viirs, cmp.celdas_ambas, cmp.solo_modis, cmp.solo_viirs];
    
    if (!cmpChart) {
        cmpChart = new Chart(document.getElementById('cmp'), {
          type: 'bar', data: { labels: ['MODIS', 'VIIRS', 'Ambas', 'Solo M', 'Solo V'], datasets: [{ data: cmpData, backgroundColor: ['#D98E2B', '#A77BF3', '#45A6C8', '#E05252', '#35B879'], borderRadius: 2, barThickness: 18 }] },
          options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }, maintainAspectRatio: false }
        });
    } else {
        cmpChart.data.datasets[0].data = cmpData;
        cmpChart.update('none');
    }
  } catch(e) { 
    if (e.name !== 'AbortError') console.error(e); 
  }
}

async function loadTimeseries(lat, lon) {
  document.getElementById('ts-empty').innerText = "Cargando historial..."; 
  document.getElementById('ts-empty').classList.remove('hidden');
  
  try {
    const ts = await (await fetch(`${API}/timeseries?lat=${lat}&lon=${lon}`)).json();
    document.getElementById('ts-empty').classList.add('hidden');
    if (tsChart) tsChart.destroy();
    tsChart = new Chart(document.getElementById('ts'), {
      type: 'line', data: { labels: ts.map(t=>t.date), datasets: [ { label: 'MODIS', data: ts.map(t=>t.modis), borderColor: '#D98E2B', borderWidth: 1.5, pointRadius: 0, tension: 0.3 }, { label: 'VIIRS', data: ts.map(t=>t.viirs), borderColor: '#A77BF3', borderWidth: 1.5, pointRadius: 0, tension: 0.3 } ] },
      options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { boxWidth: 8 } } }, scales: { x: { ticks: { maxTicksLimit: 4 }, grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } }, maintainAspectRatio: false }
    });
  } catch(e) { console.error("Error en gráfico:", e); }

  const date = document.getElementById('date').value;
  const aiContainer = document.getElementById('ai-content');
  if(aiContainer) {
      aiContainer.innerHTML = `<p style="text-align: center; margin: 20px 0; color: var(--accent-blue);">🧠 Analizando patrones con IA...</p>`;
      
      try {
        const [predRes, anomRes] = await Promise.all([
          fetch(`${API}/predict?lat=${lat}&lon=${lon}`),
          fetch(`${API}/anomaly?date=${date}`)
        ]);

        const pred = await predRes.json();
        const anom = await anomRes.json();
        
        let anomColor = "var(--status-success)"; 
        if (anom.status === "ALERTA") anomColor = "var(--accent-amber)"; 
        if (anom.status === "CRÍTICO") anomColor = "var(--status-critical)"; 
        
        aiContainer.innerHTML = `
          <div style="background: rgba(69, 166, 200, 0.1); border: 1px solid var(--accent-blue); padding: 10px; border-radius: 4px; margin-bottom: 10px;">
            <div style="font-size: 20px; font-weight: 700; color: var(--accent-blue); margin-bottom: 4px;">${pred.probability}%</div>
            <div style="line-height: 1.3;">${pred.message}</div>
          </div>
          
          <div style="background: rgba(217, 142, 43, 0.1); border: 1px solid ${anomColor}; padding: 10px; border-radius: 4px;">
            <div style="font-weight: 700; color: ${anomColor}; margin-bottom: 4px;">ESTADO: ${anom.status}</div>
            <div style="line-height: 1.3;">${anom.message}</div>
          </div>
        `;
      } catch (error) {
        console.error("Error al cargar IA:", error);
        aiContainer.innerHTML = `<p style="text-align: center; color: var(--status-critical); margin: 20px 0;">⚠️ Error al conectar con el módulo de IA.</p>`;
      }
  }
}

function closeSplitView() {
  splitActive = false; const btnSplit = document.getElementById('btn-split');
  btnSplit.classList.remove('active-split'); btnSplit.innerText = "SPLIT";
  if (mapLeft) { mapLeft.remove(); mapLeft = null; }
  if (mapRight) { mapRight.remove(); mapRight = null; }
  const splitDiv = document.getElementById('split-map'); if (splitDiv) splitDiv.remove();
  document.getElementById('map').style.display = 'block'; map.invalidateSize();
}

async function toggleSplit() {
  if (splitActive) { closeSplitView(); loadCells(); return; }
  splitActive = true; const btnSplit = document.getElementById('btn-split');
  btnSplit.classList.add('active-split'); btnSplit.innerText = "CERRAR";
  const date = document.getElementById('date').value; const minc = document.getElementById('minconf').value;
  const currentCenter = map.getCenter(); const currentZoom = map.getZoom();
  if (currentLayer) { map.removeLayer(currentLayer); currentLayer = null; }
  document.getElementById('map').style.display = 'none';
  
  const container = document.getElementById('map-wrapper');
  const splitDiv = document.createElement('div'); splitDiv.id = 'split-map'; splitDiv.style = "display:flex; height:100%; width:100%;";
  container.insertBefore(splitDiv, container.firstChild);
  
  const divLeft = document.createElement('div'); divLeft.style = "width:50%; height:100%; border-right:1px solid var(--border); position:relative;";
  divLeft.innerHTML = `<div class="split-badge" style="left:16px; color:var(--accent-amber);">MODIS</div>`;
  const divRight = document.createElement('div'); divRight.style = "width:50%; height:100%; position:relative;";
  divRight.innerHTML = `<div class="split-badge" style="right:16px; color:#A77BF3;">VIIRS</div>`;
  splitDiv.appendChild(divLeft); splitDiv.appendChild(divRight);
  
  mapLeft = L.map(divLeft, { zoomControl: false, maxZoom: 9, minZoom: 4, maxBounds: [[-90, -180], [90, 180]], maxBoundsViscosity: 1.0 }).setView(currentCenter, currentZoom);
  mapRight = L.map(divRight, { zoomControl: false, maxZoom: 9, minZoom: 4, maxBounds: [[-90, -180], [90, 180]], maxBoundsViscosity: 1.0 }).setView(currentCenter, currentZoom);
  
  L.tileLayer(esriUrl).addTo(mapLeft); L.tileLayer(esriUrl).addTo(mapRight);
  
  if (mapLeft.sync) { mapLeft.sync(mapRight); mapRight.sync(mapLeft); }
  
  try {
    const cells = await (await fetch(`${API}/cells?date=${date}&min_conf=${minc}`)).json();
    const heatLeft = cells.filter(c => c.modis > 0).map(c => [c.lat, c.lon, Math.min(c.modis / 5, 1)]);
    const heatRight = cells.filter(c => c.viirs > 0).map(c => [c.lat, c.lon, Math.min(c.viirs / 5, 1)]);
    
    L.heatLayer(heatLeft, {radius: 35, blur: 25, gradient: {1: '#D98E2B'}}).addTo(mapLeft);
    L.heatLayer(heatRight, {radius: 35, blur: 25, gradient: {1: '#A77BF3'}}).addTo(mapRight);
  } catch(e) { console.error("Error en split", e); }
}

setInterval(() => {
  const altEl = document.getElementById('sat-alt');
  const velEl = document.getElementById('sat-vel');
  if(altEl && velEl) {
    const alt = 705.4 + (Math.random() * 0.4 - 0.2);
    const vel = 7.59 + (Math.random() * 0.02 - 0.01);
    altEl.innerText = alt.toFixed(1) + ' km';
    velEl.innerText = vel.toFixed(2) + ' km/s';
  }
}, 1500);

init();