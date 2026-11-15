const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const fetchAPI = async (endpoint) => {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`Fallo en API ${endpoint}:`, error);
    throw error;
  }
};

// Añadimos el parámetro bbox (opcional)
export const getCellsByDate = (date, bbox = null) => {
  let url = `/cells?date=${date}&min_conf=3`;
  if (bbox) {
    url += `&min_lat=${bbox.minLat}&max_lat=${bbox.maxLat}&min_lon=${bbox.minLon}&max_lon=${bbox.maxLon}`;
  }
  return fetchAPI(url);
};

export const getPrediction = (lat, lon) => fetchAPI(`/predict?lat=${lat}&lon=${lon}`);
export const getAnomaly = (date) => fetchAPI(`/anomaly?date=${date}`);

// El calendario también debe aceptar el bbox
export const getCalendar = (bbox = null) => {
  let url = `/calendar`;
  if (bbox) {
    url += `?min_lat=${bbox.minLat}&max_lat=${bbox.maxLat}&min_lon=${bbox.minLon}&max_lon=${bbox.maxLon}`;
  }
  return fetchAPI(url);
};

export const getLatestDate = () => fetchAPI('/latest_date');

// NUEVA FUNCIÓN: Para obtener los datos diarios de un mes específico
export const getDailyCalendar = (year, month) => {
  // Asumimos que tu backend tendrá un endpoint /calendar/daily
  // Si no lo tienes, el componente mostrará un estado vacío.
  return fetchAPI(`/calendar/daily?year=${year}&month=${month}`);
};