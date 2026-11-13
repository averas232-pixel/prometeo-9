"""API PROMETEO-9 - calendario armonizado MODIS+VIIRS."""
from pathlib import Path
import duckdb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

PARQUET = Path("data/processed/daily_cells_harmonized.parquet")
if not PARQUET.exists():
    raise RuntimeError("Falta daily_cells_harmonized.parquet. Corre harmonize.py.")

app = FastAPI(title="PROMETEO-9 API", version="0.1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

P = PARQUET.as_posix()


def q(sql):
    return duckdb.execute(sql).fetchall()


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
    # Solo devuelve fechas donde hubo al menos 1 detección con confianza >= 3
    rows = q(f"""
        SELECT DISTINCT date 
        FROM read_parquet('{P}') 
        WHERE n_conf_total >= 3 
        ORDER BY date
    """)
    return [str(r[0]) for r in rows]


@app.get("/cells")
def cells(date: str, min_conf: int = 0):
    rows = q(f"""SELECT cell_lat, cell_lon, n_conf_total, n_conf_modis, n_conf_viirs,
        frp_total, ratio_viirs_modis
        FROM read_parquet('{P}')
        WHERE date = DATE '{date}' AND n_conf_total >= {min_conf}
        ORDER BY n_conf_total DESC LIMIT 5000""")
    return [dict(lat=float(r[0]), lon=float(r[1]), total=r[2], modis=r[3],
                 viirs=r[4], frp=float(r[5]) if r[5] is not None else 0,
                 ratio=float(r[6]) if r[6] is not None else None) for r in rows]


@app.get("/timeseries")
def timeseries(lat: float, lon: float):
    rows = q(f"""SELECT date, n_conf_modis, n_conf_viirs, n_conf_total, frp_total
        FROM read_parquet('{P}')
        WHERE cell_lat = {lat} AND cell_lon = {lon} ORDER BY date""")
    if not rows:
        raise HTTPException(404, "Celda no encontrada")
    return [dict(date=str(r[0]), modis=r[1], viirs=r[2], total=r[3],
                 frp=float(r[4]) if r[4] is not None else 0) for r in rows]


@app.get("/compare")
def compare(date: str):
    r = q(f"""SELECT
        sum(n_conf_modis), sum(n_conf_viirs), sum(n_conf_total),
        count(*) FILTER (WHERE n_conf_modis>0 AND n_conf_viirs>0),
        count(*) FILTER (WHERE n_conf_modis>0 AND n_conf_viirs=0),
        count(*) FILTER (WHERE n_conf_modis=0 AND n_conf_viirs>0)
        FROM read_parquet('{P}') WHERE date = DATE '{date}'""")[0]
    return dict(date=date, modis=r[0], viirs=r[1], total=r[2],
                celdas_ambas=r[3], solo_modis=r[4], solo_viirs=r[5])