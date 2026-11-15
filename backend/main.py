"""API PROMETEO-9 - calendario armonizado MODIS+VIIRS + AI Analytics."""
from pathlib import Path
import duckdb
import io
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sklearn.neighbors import NearestNeighbors

# --- CORRECCIÓN DE RUTA ---
BASE_DIR = Path(__file__).resolve().parent.parent
PARQUET = "https://drive.google.com/uc?export=download&id=15WkZTpJexJO2nQ-2xNu3dJY2BIC1Z56i"

if not PARQUET.exists():
    raise RuntimeError(f"Falta daily_cells_harmonized.parquet en: {PARQUET}. Corre harmonize.py.")

app = FastAPI(title="PROMETEO-9 API", version="0.3")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

P = PARQUET.as_posix()

def q(sql):
    con = duckdb.connect()
    try:
        return con.execute(sql).fetchall()
    finally:
        con.close()

# ---------------------------------------------------------
# ENDPOINTS BÁSICOS
# ---------------------------------------------------------

@app.get("/stats")
def stats():
    r = q(f"""SELECT count(*), min(date), max(date),
        sum(n_conf_modis), sum(n_conf_viirs),
        round(avg(ratio_viirs_modis) FILTER (WHERE ratio_viirs_modis IS NOT NULL),3),
        round(sum(frp_total))
        FROM read_parquet('{P}')""")[0]
    return dict(filas=r[0], desde=str(r[1]), hasta=str(r[2]),
                conf_modis=r[3], conf_viirs=r[4], ratio_prom=r[5], frp_total=r[6])

@app.get("/dates")
def dates():
    rows = q(f"SELECT DISTINCT date FROM read_parquet('{P}') WHERE n_conf_total >= 3 ORDER BY date")
    return [str(r[0]) for r in rows]

@app.get("/cells")
def cells(date: str, min_conf: int = 0, 
          min_lat: float = -90, max_lat: float = 90, 
          min_lon: float = -180, max_lon: float = 180):
    query = f"""
        SELECT cell_lat, cell_lon, n_conf_total, n_conf_modis, n_conf_viirs,
               frp_total, ratio_viirs_modis
        FROM read_parquet('{P}')
        WHERE date = DATE '{date}' 
          AND n_conf_total >= {min_conf}
          AND cell_lat >= {min_lat} AND cell_lat <= {max_lat}
          AND cell_lon >= {min_lon} AND cell_lon <= {max_lon}
        ORDER BY n_conf_total DESC LIMIT 5000
    """
    rows = q(query)
    return [dict(lat=float(r[0]), lon=float(r[1]), total=r[2], modis=r[3],
                 viirs=r[4], frp=float(r[5]) if r[5] is not None else 0,
                 ratio=float(r[6]) if r[6] is not None else None) for r in rows]

# ---------------------------------------------------------
# NUEVO ENDPOINT: CALENDARIO HISTÓRICO (ANUAL)
# ---------------------------------------------------------
@app.get("/calendar")
def calendar(min_lat: float = -90, max_lat: float = 90, 
             min_lon: float = -180, max_lon: float = 180):
    """Devuelve el conteo de detecciones agrupado por año y mes."""
    query = f"""
        SELECT 
            EXTRACT(YEAR FROM date) AS year,
            EXTRACT(MONTH FROM date) AS month,
            SUM(n_conf_total) AS total
        FROM read_parquet('{P}')
        WHERE cell_lat >= {min_lat} AND cell_lat <= {max_lat}
          AND cell_lon >= {min_lon} AND cell_lon <= {max_lon}
        GROUP BY 1, 2
        ORDER BY 1, 2
    """
    rows = q(query)
    return [dict(year=int(r[0]), month=int(r[1]), total=int(r[2] or 0)) for r in rows]

# ---------------------------------------------------------
# NUEVO ENDPOINT: CALENDARIO DIARIO (MENSUAL)
# ---------------------------------------------------------
@app.get("/calendar/daily")
def calendar_daily(year: int, month: int):
    """Devuelve el conteo de detecciones agrupado por día para un mes y año específicos."""
    query = f"""
        SELECT 
            EXTRACT(DAY FROM date) AS day,
            SUM(n_conf_total) AS total
        FROM read_parquet('{P}')
        WHERE EXTRACT(YEAR FROM date) = {year} 
          AND EXTRACT(MONTH FROM date) = {month}
        GROUP BY 1
        ORDER BY 1
    """
    rows = q(query)
    return [dict(day=int(r[0]), total=int(r[1] or 0)) for r in rows]

# ---------------------------------------------------------
# DESCARGA CSV
# ---------------------------------------------------------
@app.get("/download")
def download_csv(date: str, 
                 min_lat: float = -90, max_lat: float = 90, 
                 min_lon: float = -180, max_lon: float = 180):
    query = f"""
        SELECT date, cell_lat, cell_lon, n_conf_modis, n_conf_viirs, n_conf_total, ratio_viirs_modis
        FROM read_parquet('{P}') 
        WHERE date = DATE '{date}'
          AND cell_lat >= {min_lat} AND cell_lat <= {max_lat}
          AND cell_lon >= {min_lon} AND cell_lon <= {max_lon}
    """
    rows = q(query)
    output = io.StringIO()
    output.write("date,lat,lon,modis_detections,viirs_detections,total_detections,bias_ratio\n")
    for row in rows:
        output.write(f"{row[0]},{row[1]},{row[2]},{row[3]},{row[4]},{row[5]},{row[6]}\n")
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=prometeo9_{date}.csv"})

@app.get("/timeseries")
def timeseries(lat: float, lon: float):
    rows = q(f"""SELECT date, n_conf_modis, n_conf_viirs, n_conf_total, frp_total
        FROM read_parquet('{P}') WHERE cell_lat = {lat} AND cell_lon = {lon} ORDER BY date""")
    if not rows:
        raise HTTPException(404, "Celda no encontrada")
    return [dict(date=str(r[0]), modis=r[1], viirs=r[2], total=r[3], frp=float(r[4]) if r[4] is not None else 0) for r in rows]

@app.get("/compare")
def compare(date: str):
    r = q(f"""SELECT
        sum(n_conf_modis), sum(n_conf_viirs), sum(n_conf_total),
        count(*) FILTER (WHERE n_conf_modis>0 AND n_conf_viirs>0),
        count(*) FILTER (WHERE n_conf_modis>0 AND n_conf_viirs=0),
        count(*) FILTER (WHERE n_conf_modis=0 AND n_conf_viirs>0)
        FROM read_parquet('{P}') WHERE date = DATE '{date}'""")[0]
    return dict(date=date, modis=r[0], viirs=r[1], total=r[2], celdas_ambas=r[3], solo_modis=r[4], solo_viirs=r[5])

# ---------------------------------------------------------
# ENDPOINTS DE IA Y PREDICCIÓN
# ---------------------------------------------------------

@app.get("/predict")
def predict(lat: float, lon: float, k: int = 5):
    data = q(f"SELECT DISTINCT cell_lat, cell_lon, sum(n_conf_total) as total FROM read_parquet('{P}') GROUP BY 1,2")
    if len(data) < k:
        raise HTTPException(400, "No hay suficientes datos históricos")
        
    coords = np.array([[r[0], r[1]] for r in data])
    weights = np.array([r[2] for r in data])
    
    knn = NearestNeighbors(n_neighbors=k, metric='euclidean')
    knn.fit(coords)
    
    distances, indices = knn.kneighbors(np.array([[lat, lon]]))
    neighbor_indices = indices[0]
    neighbor_weights = weights[neighbor_indices]
    
    avg_neighbor_fires = np.mean(neighbor_weights)
    
    if avg_neighbor_fires > 0:
        prob = min(int(np.log10(avg_neighbor_fires + 1) * 25), 99)
    else:
        prob = 0
        
    min_dist = distances[0][0]
    if min_dist > 2.0:
        prob = int(prob * 0.2)
    
    return dict(
        probability=prob, 
        message=f"Esta zona tiene un {prob}% de probabilidad de reincidencia de incendios basado en patrones de {k} celdas cercanas.",
        neighbors=[dict(lat=float(coords[i][0]), lon=float(coords[i][1]), fire_count=int(weights[i])) for i in neighbor_indices]
    )

@app.get("/anomaly")
def anomaly(date: str):
    year = int(date[:4])
    month = int(date[5:7])
    
    query = f"""
        SELECT 
            SUM(CASE WHEN date = DATE '{date}' THEN n_conf_total ELSE 0 END) as current_fire,
            AVG(CASE WHEN EXTRACT(MONTH FROM date) = {month} AND EXTRACT(YEAR FROM date) < {year} THEN n_conf_total ELSE NULL END) as historical_avg
        FROM read_parquet('{P}')
    """
    res = q(query)[0]
    current = res[0] if res[0] else 0
    hist_avg = res[1] if res[1] else 0
    
    if hist_avg == 0:
        return dict(status="NORMAL", current=current, avg=0, anomaly_pct=0, message="Sin historial suficiente para comparar.")
        
    anomaly_pct = int(((current - hist_avg) / hist_avg) * 100)
    
    status = "NORMAL"
    if anomaly_pct > 50: status = "ALERTA"
    if anomaly_pct > 150: status = "CRÍTICO"
    
    return dict(
        status=status, 
        current=int(current), 
        avg=round(float(hist_avg), 2), 
        anomaly_pct=anomaly_pct,
        message=f"Actividad actual: {current} detecciones. Promedio histórico: {int(hist_avg)}. Desviación: {anomaly_pct}%."
    )

@app.get("/latest_date")
def latest_date():
    r = q(f"SELECT MAX(date) FROM read_parquet('{P}')")[0]
    return {"latest": str(r[0])}
