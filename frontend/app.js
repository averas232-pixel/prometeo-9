const API = "http://127.0.0.1:8000";
let mapPrimary, mapSecondary;
let pixelGroupPrimary, pixelGroupSecondary;
let drawnItems;
let state = { date: "2019-08-25", vizMode: "heat", isSplit: false, bbox: null, allCells: [] };
let sensorChart;

setInterval(() => {
  const now = new Date();
  document.getElementById("utcTime").textContent = now.toISOString().slice(11, 19) + " UTC";
  document.getElementById("utcDate").textContent = now.toISOString().slice(0, 10);
}, 1000);

function initMaps() {
  const worldBounds = L.latLngBounds([-90, -180], [90, 180]);
  mapPrimary = L.map("mapPrimary", { center: [-12, -60], zoom: 4, zoomControl: false, maxBounds: worldBounds, maxBoundsViscosity: 1.0 });
  mapSecondary = L.map("mapSecondary", { center: [-12, -60], zoom: 4, zoomControl: false, maxBounds: worldBounds, maxBoundsViscosity: 1.0 });
  
  L.control.zoom({ position: 'bottomright' }).addTo(mapPrimary);
  L.control.zoom({ position: 'bottomright' }).addTo(mapSecondary);

  // Capa Base: ESRI World Imagery (Alta definición, sin API Key)
  const esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  L.tileLayer(esriUrl, { attribution: '&copy; ESRI', noWrap: true }).addTo(mapPrimary);
  L.tileLayer(esriUrl, { attribution: '&copy; ESRI', noWrap: true }).addTo(mapSecondary);

  pixelGroupPrimary = L.layerGroup().addTo(mapPrimary);
  pixelGroupSecondary = L.layerGroup().addTo(mapSecondary);

  mapPrimary.on('move', () => { if (state.isSplit) mapSecondary.setView(mapPrimary.getCenter(), mapPrimary.getZoom(), { animate: false }); });
  mapSecondary.on('move', () => { if (state.isSplit) mapPrimary.setView(mapSecondary.getCenter(), mapSecondary.getZoom(), { animate: false }); });

  drawnItems = new L.FeatureGroup();
  mapPrimary.addLayer(drawnItems);
  const drawControl = new L.Control.Draw({
    position: 'topleft',
    edit: { featureGroup: drawnItems },
    draw: { polygon: false, circle: false, marker: false, circlemarker: false, polyline: false, rectangle: true }
  });
  mapPrimary.addControl(drawControl);

  mapPrimary.on(L.Draw.Event.CREATED, (e) => {
    drawnItems.clearLayers();
    drawnItems.addLayer(e.layer);
    const bounds = e.layer.getBounds();
    state.bbox = { south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() };
    document.getElementById('bboxHudBadge').classList.add('visible');
    document.getElementById('bboxCoordsText').innerText = `BBOX: [${state.bbox.south.toFixed(2)}, ${state.bbox.west.toFixed(2)}]`;
    loadDataForDate(state.date);
  });

  document.getElementById('btnClearBbox').addEventListener('click', () => {
    state.bbox = null;
    drawnItems.clearLayers();
    document.getElementById('bboxHudBadge').classList.remove('visible');
    loadDataForDate(state.date);
  });
}

function initCharts() {
  Chart.defaults.font.family = "'IBM Plex Mono', monospace";
  Chart.defaults.color = "#8ba3c7";

  const ctxSensor = document.getElementById("sensorChart").getContext("2d");
  sensorChart = new Chart(ctxSensor, {
    type: "bar",
    data: { labels: ["MODIS", "VIIRS", "Ambas", "Solo M", "Solo V"], datasets: [{ data: [0,0,0,0,0], backgroundColor: ["#0B3D91", "#ffb000", "#35B879", "#FC3D21", "#8ba3c7"], borderRadius: 2 }] },
    options: { animation: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.05)' } } }, maintainAspectRatio: false }
  });
}

async function loadDataForDate(date) {
  state.date = date;
  document.getElementById('datePicker').value = date;
  try {
    let url = `${API}/cells?date=${date}&min_conf=3`;
    if (state.bbox) url += `&min_lat=${state.bbox.south}&max_lat=${state.bbox.north}&min_lon=${state.bbox.west}&max_lon=${state.bbox.east}`;
    
    const res = await fetch(url);
    const cells = await res.json();
    state.allCells = cells;
    renderMap(cells);
    
    const cmp = await (await fetch(`${API}/compare?date=${date}`)).json();
    sensorChart.data.datasets[0].data = [cmp.modis, cmp.viirs, cmp.celdas_ambas, cmp.solo_modis, cmp.solo_viirs];
    sensorChart.update();

    const totalFires = cells.reduce((sum, c) => sum + c.total, 0);
    const totalFrp = cells.reduce((sum, c) => sum + c.frp, 0);
    const criticalCount = cells.filter(c => c.total > 15).length;
    document.getElementById('hdrTotalFires').innerText = totalFires.toLocaleString();
    document.getElementById('hdrTotalFrp').innerText = `${totalFrp.toFixed(1)} MW`;
    document.getElementById('hdrCriticalCount').innerText = criticalCount.toLocaleString();
  } catch (e) { console.error("Error cargando datos", e); }
}

function renderMap(cells) {
  pixelGroupPrimary.clearLayers();
  pixelGroupSecondary.clearLayers();

  if (cells.length === 0) return;

  if (state.vizMode === 'heat') {
    // NUEVA VISUALIZACIÓN: Círculos de densidad (Como NASA FIRMS)
    cells.forEach(c => {
      let color, size;
      if (c.total > 15) { color = '#FC3D21'; size = 12; } // Rojo
      else if (c.total > 5) { color = '#ffb000'; size = 8; } // Naranja
      else { color = '#00f0ff'; size = 4; } // Cian

      // Halo exterior
      L.circle([c.lat, c.lon], { radius: size * 1000, color: color, weight: 1, fillColor: color, fillOpacity: 0.3 }).addTo(mapPrimary);
      // Punto central
      L.circleMarker([c.lat, c.lon], { radius: size / 2, color: '#fff', weight: 1, fillColor: color, fillOpacity: 0.9 })
        .on('click', () => handleCellClick(c)).addTo(mapPrimary);

      if (state.isSplit) {
        L.circleMarker([c.lat, c.lon], { radius: size / 2, color: '#fff', weight: 1, fillColor: color, fillOpacity: 0.9 })
          .on('click', () => handleCellClick(c)).addTo(mapSecondary);
      }
    });
  } else {
    // MODO PÍXELES (Cuadrados)
    cells.forEach(c => {
      const color = c.total > 15 ? '#FC3D21' : (c.total > 5 ? '#ffb000' : '#0B3D91');
      const rect1 = L.rectangle([[c.lat - 0.125, c.lon - 0.125], [c.lat + 0.125, c.lon + 0.125]], { color: color, weight: 1, fillColor: color, fillOpacity: 0.6 }).addTo(pixelGroupPrimary);
      rect1.on('click', () => handleCellClick(c));
      
      if (state.isSplit) {
        const rect2 = L.rectangle([[c.lat - 0.125, c.lon - 0.125], [c.lat + 0.125, c.lon + 0.125]], { color: color, weight: 1, fillColor: color, fillOpacity: 0.6 }).addTo(pixelGroupSecondary);
        rect2.on('click', () => handleCellClick(c));
      }
    });
  }
}

async function handleCellClick(cell) {
  const total = cell.modis + cell.viirs;
  let color = total > 15 ? 'red' : (total > 5 ? 'orange' : 'yellow');
  let title = total > 15 ? 'ALTA DENSIDAD' : (total > 5 ? 'DENSIDAD MODERADA' : 'DENSIDAD BAJA');
  let reco = total > 15 ? 'Concentración inusual. No es alerta oficial.' : 'Actividad térmica detectada.';

  const popupHTML = `
    <div class="fire-popup-card">
      <div class="fire-popup-banner ${color}"><span>${title}</span><span>${total} MW</span></div>
      <div class="fire-popup-grid">
        <div class="fire-popup-item"><span>MODIS</span>${cell.modis}</div>
        <div class="fire-popup-item"><span>VIIRS</span>${cell.viirs}</div>
        <div class="fire-popup-item" style="grid-column: span 2;"><span>RECOMENDACIÓN</span>${reco}</div>
      </div>
    </div>
  `;
  L.popup().setLatLng([cell.lat, cell.lon]).setContent(popupHTML).openOn(mapPrimary);

  try {
    const [pred, anom] = await Promise.all([
      (await fetch(`${API}/predict?lat=${cell.lat}&lon=${cell.lon}`)).json(),
      (await fetch(`${API}/anomaly?date=${state.date}`)).json()
    ]);
    
    document.getElementById('aiProbValue').innerText = `${pred.probability}%`;
    document.getElementById('aiMeterFill').style.width = `${pred.probability}%`;
    document.getElementById('aiSummaryText').innerText = pred.message;
    
    const badge = document.getElementById('aiStatusBadge');
    if (pred.probability > 75) { badge.innerText = 'CRÍTICO'; badge.className = 'ai-status-badge critico'; }
    else if (pred.probability > 45) { badge.innerText = 'ALERTA'; badge.className = 'ai-status-badge alerta'; }
    else { badge.innerText = 'NORMAL'; badge.className = 'ai-status-badge'; }
  } catch(e) { console.error("Error en IA", e); }
}

async function loadCalendar() {
  const container = document.getElementById('burnCalendarGrid');
  container.innerHTML = '<div style="color:#8ba3c7;text-align:center;padding:10px;font-family:monospace;">Cargando calendario histórico...</div>';
  
  try {
    const res = await fetch(`${API}/calendar`);
    const data = await res.json();
    const maxTotal = Math.max(...data.map(d => d.total), 1);
    const years = [...new Set(data.map(d => d.year))].sort().reverse();
    container.innerHTML = '';
    
    for (let year of years) {
      const row = document.createElement('div');
      row.className = 'cal-row';
      const yLabel = document.createElement('div');
      yLabel.className = 'cal-year';
      yLabel.innerText = year;
      row.appendChild(yLabel);
      
      const cells = document.createElement('div');
      cells.className = 'cal-cells';
      
      for (let m = 1; m <= 12; m++) {
        const monthData = data.find(d => d.year === year && d.month === m);
        const total = monthData ? monthData.total : 0;
        
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        
        if (total === 0) {
            cell.style.background = '#1a2a38'; // Gris
        } else {
            const ratio = total / maxTotal;
            if (ratio > 0.8) cell.style.background = '#FC3D21'; // Rojo
            else if (ratio > 0.5) cell.style.background = '#ff7b00'; // Naranja
            else if (ratio > 0.2) cell.style.background = '#ffb000'; // Amarillo
            else cell.style.background = '#0B3D91'; // Azul
        }
        
        cell.title = `${year}-${String(m).padStart(2, '0')}: ${total} detecciones`;
        cell.addEventListener('click', () => {
          const targetDate = `${year}-${String(m).padStart(2, '0')}-15`;
          loadDataForDate(targetDate);
        });
        cells.appendChild(cell);
      }
      row.appendChild(cells);
      container.appendChild(row);
    }
  } catch(e) {
    container.innerHTML = '<div style="color:#8ba3c7;text-align:center;padding:10px;font-family:monospace;">Error al cargar.</div>';
  }
}

document.getElementById('btnSplitView').addEventListener('click', () => {
  state.isSplit = !state.isSplit;
  document.getElementById('mapStage').classList.toggle('split-active', state.isSplit);
  setTimeout(() => { mapPrimary.invalidateSize(); mapSecondary.invalidateSize(); renderMap(state.allCells); }, 250);
});

document.querySelectorAll('[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.vizMode = btn.dataset.mode;
    renderMap(state.allCells);
  });
});

let datesArray = [];
function stepDate(dir) {
  const idx = datesArray.indexOf(state.date);
  const next = idx + dir;
  if (next >= 0 && next < datesArray.length) loadDataForDate(datesArray[next]);
}

let playing = false;
let playTimer;
function togglePlay() {
  playing = !playing;
  document.getElementById('btnPlay').innerText = playing ? '⏸ PAUSE' : '▶ REPRODUCIR';
  if (playing) {
    playTimer = setInterval(() => {
      const idx = datesArray.indexOf(state.date);
      const next = idx + 1 >= datesArray.length ? 0 : idx + 1;
      loadDataForDate(datesArray[next]);
    }, 800);
  } else {
    clearInterval(playTimer);
  }
}

document.getElementById('btnExportCsv').addEventListener('click', () => {
  window.location.href = `${API}/download?date=${state.date}`;
});

window.addEventListener('DOMContentLoaded', async () => {
  initMaps();
  initCharts();
  loadCalendar();
  
  try {
    const dates = await (await fetch(`${API}/dates`)).json();
    datesArray = dates.filter(d => d >= "2012-01-01");
    if (datesArray.length > 0) {
      loadDataForDate(datesArray.find(d => d >= "2019-08-25") || datesArray[0]);
    }
  } catch(e) {
    document.getElementById('apiStatusText').innerText = 'API OFFLINE';
  }
});