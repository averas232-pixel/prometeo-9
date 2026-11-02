"""
Descarga el archivo histórico de detecciones de fuego activo de NASA FIRMS.

Por qué por tramos: la API devuelve pocos días por consulta. Descargamos en tramos
de 5 días y guardamos cada uno en un CSV dentro de data/raw/<FUENTE>/.
El script es reanudable: si se corta, al volver a correrlo salta los tramos ya
descargados.

Uso (desde la raíz del repo):
  python data-pipeline/firms_download.py --check
  python data-pipeline/firms_download.py --source MODIS_SP --start 2020-01-01 --end 2020-01-31
"""
import argparse
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE = "https://firms.modaps.eosdis.nasa.gov/api"
SOURCES = [
    "MODIS_SP", "VIIRS_SNPP_SP", "VIIRS_NOAA20_SP", "VIIRS_NOAA21_SP",
    "MODIS_NRT", "VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT",
]
PERU_BBOX = "-82,-19,-68,0"  # oeste,sur,este,norte (Perú y bordes de países vecinos)
CHUNK_DAYS = 5               # seguro bajo los límites documentados
RAW_DIR = Path("data/raw")


def get_key():
    load_dotenv()
    key = os.getenv("FIRMS_MAP_KEY", "").strip()
    if not key:
        sys.exit("Falta FIRMS_MAP_KEY. Copia .env.example a .env y pega tu clave.")
    return key


def fetch(url, label, retries=4):
    """GET con reintentos. Nunca imprime la URL, porque lleva la clave."""
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, timeout=60)
            if r.status_code == 200:
                return r.text
            if r.status_code == 429:
                wait = 30 * attempt
                print(f"  límite de consultas (429) en {label}, espero {wait}s...")
                time.sleep(wait)
                continue
            print(f"  HTTP {r.status_code} en {label}: {r.text[:120]}")
        except requests.RequestException as e:
            print(f"  error de red en {label}: {type(e).__name__}")
        time.sleep(5 * attempt)
    raise RuntimeError(f"No se pudo descargar {label}")


def check(key):
    """Muestra desde y hasta qué fechas hay datos disponibles por sensor."""
    print(fetch(f"{BASE}/data_availability/csv/{key}/ALL", "data_availability"))


def chunks(start, end, step):
    d = start
    while d <= end:
        n = min(step, (end - d).days + 1)
        yield d, n
        d += timedelta(days=n)


def download(source, start, end, bbox, key):
    out_dir = RAW_DIR / source
    out_dir.mkdir(parents=True, exist_ok=True)
    total = skipped = 0
    for d, n in chunks(start, end, CHUNK_DAYS):
        path = out_dir / f"{d.isoformat()}_{n}d.csv"
        if path.exists():
            skipped += 1
            continue
        url = f"{BASE}/area/csv/{key}/{source}/{bbox}/{n}/{d.isoformat()}"
        text = fetch(url, f"{source} {d}")
        if not text.startswith("latitude"):
            raise RuntimeError(f"Respuesta inesperada en {source} {d}: {text[:150]}")
        path.write_text(text, encoding="utf-8")
        rows = max(text.count("\n") - 1, 0)
        total += rows
        print(f"{source} {d} (+{n}d): {rows} detecciones")
        time.sleep(0.2)
    print(f"Listo {source}: {total} detecciones nuevas, {skipped} tramos ya existían.")


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--check", action="store_true",
                   help="muestra las fechas disponibles por sensor")
    p.add_argument("--source", choices=SOURCES)
    p.add_argument("--start", type=date.fromisoformat, help="YYYY-MM-DD")
    p.add_argument("--end", type=date.fromisoformat, help="YYYY-MM-DD")
    p.add_argument("--bbox", default=PERU_BBOX, help="oeste,sur,este,norte")
    a = p.parse_args()

    key = get_key()
    if a.check:
        check(key)
        return
    if not (a.source and a.start and a.end):
        p.error("indica --source, --start y --end (o usa --check)")
    download(a.source, a.start, a.end, a.bbox, key)


if __name__ == "__main__":
    main()