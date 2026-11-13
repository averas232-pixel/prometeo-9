"""
Agrega las detecciones crudas de FIRMS a una tabla diaria por celda de grilla y sensor.

Entrada : data/raw/<FUENTE>/*.csv   (los deja firms_download.py)
Salida  : data/processed/daily_cells_<FUENTE>.parquet

Columnas: date, sensor, cell_lat, cell_lon, n_det, n_conf, frp_sum

- n_det  : todas las detecciones del día en la celda.
- n_conf : solo las de confianza nominal o alta (MODIS >= 30, VIIRS 'n' o 'h').
- frp_sum: potencia radiativa del fuego total del día en la celda (MW).
"""
import argparse
from pathlib import Path

import duckdb

SENSOR_BY_SOURCE = {
    "MODIS_SP": "MODIS", "MODIS_NRT": "MODIS",
    "VIIRS_SNPP_SP": "VIIRS_SNPP", "VIIRS_SNPP_NRT": "VIIRS_SNPP",
    "VIIRS_NOAA20_SP": "VIIRS_NOAA20", "VIIRS_NOAA20_NRT": "VIIRS_NOAA20",
    "VIIRS_NOAA21_SP": "VIIRS_NOAA21", "VIIRS_NOAA21_NRT": "VIIRS_NOAA21",
}


def conf_ok_sql(source):
    """Condición SQL de 'confianza nominal o alta' según el sensor."""
    if source.startswith("MODIS"):
        return "TRY_CAST(confidence AS INTEGER) >= 30"
    return "lower(confidence) IN ('n', 'h')"


def aggregate_source(source, raw_dir=Path("data/raw"), out_dir=Path("data/processed"), cell=0.25):
    """Agrega una fuente. Devuelve (ruta del parquet, número de filas)."""
    raw_dir, out_dir = Path(raw_dir), Path(out_dir)
    if not list((raw_dir / source).glob("*.csv")):
        raise FileNotFoundError(f"No hay CSV en {raw_dir / source}")
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"daily_cells_{source}.parquet"
    pattern = (raw_dir / source / "*.csv").as_posix()
    
    duckdb.execute(f"""
        COPY (
          SELECT
            CAST(acq_date AS DATE) AS date,
            '{SENSOR_BY_SOURCE[source]}' AS sensor,
            round(floor((CAST(latitude AS DOUBLE) + 90) / {cell}) * {cell} - 90 + {cell} / 2, 4) AS cell_lat,
            round(floor((CAST(longitude AS DOUBLE) + 180) / {cell}) * {cell} - 180 + {cell} / 2, 4) AS cell_lon,
            count(*) AS n_det,
            count(*) FILTER (WHERE {conf_ok_sql(source)}) AS n_conf,
            sum(TRY_CAST(frp AS DOUBLE)) AS frp_sum
          FROM read_csv('{pattern}', all_varchar = true, union_by_name = true)
          GROUP BY 1, 2, 3, 4
          ORDER BY 1, 3, 4
        ) TO '{out.as_posix()}' (FORMAT PARQUET)
    """)
    n = duckdb.execute(f"SELECT count(*) FROM read_parquet('{out.as_posix()}')").fetchone()[0]
    return out, n


def summary(out_dir=Path("data/processed")):
    """Resume lo ya agregado, por sensor."""
    pattern = (Path(out_dir) / "daily_cells_*.parquet").as_posix()
    rows = duckdb.execute(f"""
        SELECT sensor, min(date), max(date), count(*), sum(n_det), sum(n_conf), round(sum(frp_sum))
        FROM read_parquet('{pattern}')
        GROUP BY sensor ORDER BY sensor
    """).fetchall()
    print("sensor | desde | hasta | filas | detecciones | conf>=nominal | FRP total (MW)")
    for r in rows:
        print(" | ".join(str(x) for x in r))


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--source", action="append", choices=list(SENSOR_BY_SOURCE),
                   help="fuente a agregar (repetible)")
    p.add_argument("--cell", type=float, default=0.25, help="tamaño de celda en grados")
    p.add_argument("--summary", action="store_true", help="resume lo ya agregado")
    a = p.parse_args()

    if a.summary:
        summary()
        return
    if not a.source:
        p.error("indica al menos un --source (o usa --summary)")
    for s in a.source:
        out, n = aggregate_source(s, cell=a.cell)
        print(f"{s}: {n} filas -> {out}")


if __name__ == "__main__":
    main()