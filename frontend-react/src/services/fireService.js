import { fetchWithErrorHandling } from './api';
export const getCellsByDate = (date) => fetchWithErrorHandling(`/cells?date=${date}&min_conf=3`);
export const getPrediction = (lat, lon) => fetchWithErrorHandling(`/predict?lat=${lat}&lon=${lon}`);
export const getAnomaly = (date) => fetchWithErrorHandling(`/anomaly?date=${date}`);