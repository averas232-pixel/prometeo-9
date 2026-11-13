const API = "http://127.0.0.1:8000"; 
let currentLayer = null, cmpChart = null, tsChart = null;
let validDates = [], isPlaying = false, playInterval = null, splitActive = false;
let mapRight = null, mapLeft = null;
let currentBaseMap = 'esri';
let currentLayerType = 'heat';

Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.color = "#94A8BE";
Chart.defaults.font.size = 10;

const esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const gibsUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2019-08-25/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg';

// 1. ZOOM MINIMO A 4 Y LIMITES ESTRICTOS
const map = L.map('map', { 
  zoomControl: false, 
  maxZoom: 9, 
  minZoom: 4, 
  maxBounds: [[-90, -180], [90, 180]],
  maxBoundsViscosity: 1.0
}).setView([-12, -75], 4);

let baseLayer = L.tileLayer(esriUrl, { attribution: 'Tiles &copy; Esri' }).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);

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
  if(currentBaseMap === 'esri') {
    map.removeLayer(baseLayer);
    baseLayer = L.tileLayer(gibsUrl, { attribution: 'NASA GIBS' }).addTo(map);
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

async function init() {
  try {
    const s = await (await fetch(`${API}/stats`)).json();
    document.getElementById('metrics-container').innerHTML = `
      <div class="metric"><span>SESGO V/M</span><span style="color:var(--accent-amber)">${s.ratio_prom}x</span></div>
      <div class="metric"><span>MODIS</span><span>${s.conf_modis.toLocaleString()}</span></div>
      <div class="metric"><span>VIIRS</span><span>${s.conf_viirs.toLocaleString()}</span></div>`;
       
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
    document.getElementById('metrics-container').innerHTML = `<span class="status-text" style="color:var(--status-critical)">OFFLINE</span>`;
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
  if (currentLayer) map.removeLayer(currentLayer);
  
  try {
    const cells = await (await fetch(`${API}/cells?date=${date}&min_conf=${minc}`)).json();
    document.getElementById('cmp-empty').classList.add('hidden');
    
    if (cells.length === 0) {
      currentLayer = L.layerGroup().addTo(map);
      document.getElementById('cmp-empty').classList.remove('hidden');
      document.getElementById('cmp-empty').innerText = "Sin detecciones para esta fecha";
      return;
    }

    if(currentLayerType === 'heat') {
      const heatData = cells.map(c => [c.lat, c.lon, Math.min(c.total / 5, 1)]);
      const heatLayer = L.heatLayer(heatData, { radius: 25, blur: 15, maxZoom: 9, gradient: {0.4: '#45A6C8', 0.7: '#D98E2B', 1: '#E05252'} });
      const clickLayer = L.layerGroup();
      cells.forEach(c => {
        L.circleMarker([c.lat, c.lon], { radius: 8, fillOpacity: 0, stroke: false })
        .bindTooltip(`<div style="color:var(--text-secondary); font-size:10px; margin-bottom:4px">CELDA</div><div>MODIS: <b style="color:var(--accent-amber)">${c.modis}</b> | VIIRS: <b style="color:#A77BF3">${c.viirs}</b></div>`, {className: 'leaflet-tooltip-custom'})
        .on('click', () => loadTimeseries(c.lat, c.lon))
        .addTo(clickLayer);
      });
      currentLayer = L.layerGroup([heatLayer, clickLayer]).addTo(map);
    } else {
      // 3. MODO PIXELES MEJORADO (Estilo NASA FIRMS)
      const pixelLayer = L.layerGroup();
      cells.forEach(c => {
        // Colores institucionales para el fuego: Amarillo/Naranja/Rojo
        let fillColor = c.total > 8 ? '#ff3333' : (c.total > 4 ? '#ff8c00' : '#ffff00');
        let borderColor = c.total > 4 ? '#ff0000' : '#ffa500';
        
        L.rectangle([[c.lat - 0.125, c.lon - 0.125], [c.lat + 0.125, c.lon + 0.125]], { 
          color: borderColor, 
          weight: 0.5, 
          fillColor: fillColor, 
          fillOpacity: 0.85 
        })
        .bindTooltip(`<div style="color:var(--text-secondary); font-size:10px; margin-bottom:4px">PÍXEL DE FUEGO</div><div>MODIS: <b style="color:var(--accent-amber)">${c.modis}</b> | VIIRS: <b style="color:#A77BF3">${c.viirs}</b></div>`, {className: 'leaflet-tooltip-custom'})
        .on('click', () => loadTimeseries(c.lat, c.lon))
        .addTo(pixelLayer);
      });
      currentLayer = pixelLayer.addTo(map);
    }

    const cmp = await (await fetch(`${API}/compare?date=${date}`)).json();
    if (cmpChart) cmpChart.destroy();
    cmpChart = new Chart(document.getElementById('cmp'), {
      type: 'bar', data: { labels: ['MODIS', 'VIIRS', 'Ambas', 'Solo M', 'Solo V'], datasets: [{ data: [cmp.modis, cmp.viirs, cmp.celdas_ambas, cmp.solo_modis, cmp.solo_viirs], backgroundColor: ['#D98E2B', '#A77BF3', '#45A6C8', '#E05252', '#35B879'], borderRadius: 2, barThickness: 18 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }, maintainAspectRatio: false }
    });
  } catch(e) { console.error(e); }
}

async function loadTimeseries(lat, lon) {
  document.getElementById('ts-empty').innerText = "Cargando historial..."; document.getElementById('ts-empty').classList.remove('hidden');
  const ts = await (await fetch(`${API}/timeseries?lat=${lat}&lon=${lon}`)).json();
  document.getElementById('ts-empty').classList.add('hidden');
  if (tsChart) tsChart.destroy();
  tsChart = new Chart(document.getElementById('ts'), {
    type: 'line', data: { labels: ts.map(t=>t.date), datasets: [ { label: 'MODIS', data: ts.map(t=>t.modis), borderColor: '#D98E2B', borderWidth: 1.5, pointRadius: 0, tension: 0.3 }, { label: 'VIIRS', data: ts.map(t=>t.viirs), borderColor: '#A77BF3', borderWidth: 1.5, pointRadius: 0, tension: 0.3 } ] },
    options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { boxWidth: 8 } } }, scales: { x: { ticks: { maxTicksLimit: 4 }, grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } }, maintainAspectRatio: false }
  });
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
  if (currentLayer) map.removeLayer(currentLayer);
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
  mapLeft.sync(mapRight); mapRight.sync(mapLeft);
  
  const cells = await (await fetch(`${API}/cells?date=${date}&min_conf=${minc}`)).json();
  const heatLeft = cells.filter(c => c.modis > 0).map(c => [c.lat, c.lon, Math.min(c.modis / 5, 1)]);
  const heatRight = cells.filter(c => c.viirs > 0).map(c => [c.lat, c.lon, Math.min(c.viirs / 5, 1)]);
  
  L.heatLayer(heatLeft, {radius: 25, blur: 15, gradient: {1: '#D98E2B'}}).addTo(mapLeft);
  L.heatLayer(heatRight, {radius: 25, blur: 15, gradient: {1: '#A77BF3'}}).addTo(mapRight);
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