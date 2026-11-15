const API_BASE = 'http://127.0.0.1:8000';
export const fetchWithErrorHandling = async (endpoint) => {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`Error en API ${endpoint}:`, error);
    throw error;
  }
};