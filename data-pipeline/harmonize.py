"""
Armoniza MODIS y VIIRS en un solo calendario diario por celda.

Entrada : data/processed/daily_cells_<FUENTE>.parquet  (los de aggregate.py)
Salida  : data/processed/daily_cells_harmonized.parquet

Columnas de salida:
  date, cell_lat, cell_lon,
  n_det_modis, n_conf_modis, frp_modis,
  n_det_viirs, n_conf_viirs, frp_viirs,
  n_det_total, n_conf_total, frp_total,
  ratio_viirs_modis   (n_conf_viirs / n_conf_modis, NULL si modis=0)

La armonizacion es a nivel de celda-dia: se unen ambas fuentes por (date, cell)
y se exponen conteos separados + totales. El ratio permite ver el sesgo entre
sensores (MODIS 1 km vs VIIRS 375 m).

Uso:
  python data-pipeline/harmonize.py
  python data-pipeline/harmonize.py --summary
"""
import argparse
from pathlib import Path
import duckdb

PROCESSED = Path("data/processed")
OUT = PROCESSED / "daily_cells_harmonized.parquet"


def harmonize(processed=PROCESSED, out=OUT):
    modis = (Path(processed) / "daily_cells_MODIS_SP.parquet").as_posix()
    viirs = (Path(processed) / "daily_cells_VIIRS_SNPP_SP.parquet").as_posix()
    for p in (modis, viirs):
        if not Path(p).exists():
            raise FileNotFoundError(f"Falta {p}. Corre aggregate.py primero.")
    Path(out).parent.mkdir(parents=True, exist_ok=True)

    duckdb.execute(f"""
        COPY (
          WITH m AS (
            SELECT date, cell_lat, cell_lon,
                   n_det AS n_det_modis, n_conf AS n_conf_modis, frp_sum AS frp_modis
            FROM read_parquet('{modis}')
          ), v AS (
            SELECT date, cell_lat, cell_lon,
                   n_det AS n_det_viirs, n_conf AS n_conf_viirs, frp_sum AS frp_viirs
            FROM read_parquet('{viirs}')
          )
          SELECT
            coalesce(m.date, v.date) AS date,
            coalesce(m.cell_lat, v.cell_lat) AS cell_lat,
            coalesce(m.cell_lon, v.cell_lon) AS cell_lon,
            coalesce(m.n_det_modis, 0) AS n_det_modis,
            coalesce(m.n_conf_modis, 0) AS n_conf_modis,
            coalesce(m.frp_modis, 0) AS frp_modis,
            coalesce(v.n_det_viirs, 0) AS n_det_viirs,
            coalesce(v.n_conf_viirs, 0) AS n_conf_viirs,
            coalesce(v.frp_viirs, 0) AS frp_viirs,
            coalesce(m.n_det_modis,0) + coalesce(v.n_det_viirs,0) AS n_det_total,
            coalesce(m.n_conf_modis,0) + coalesce(v.n_conf_viirs,0) AS n_conf_total,
            coalesce(m.frp_modis,0) + coalesce(v.frp_viirs,0) AS frp_total,
            CASE WHEN m.n_conf_modis IS NOT NULL AND m.n_conf_modis > 0
                 THEN coalesce(v.n_conf_viirs,0)::DOUBLE / m.n_conf_modis
                 ELSE NULL END AS ratio_viirs_modis
          FROM m FULL OUTER JOIN v
            ON m.date = v.date AND m.cell_lat = v.cell_lat AND m.cell_lon = v.cell_lon
          ORDER BY date, cell_lat, cell_lon
        ) TO '{Path(out).as_posix()}' (FORMAT PARQUET)
    """)
    n = duckdb.execute(f"SELECT count(*) FROM read_parquet('{Path(out).as_posix()}')").fetchone()[0]
    return out, n


def summary(out=OUT):
    rows = duckdb.execute(f"""
        SELECT
          count(*) AS filas,
          min(date) AS desde, max(date) AS hasta,
          sum(n_conf_modis) AS conf_modis,
          sum(n_conf_viirs) AS conf_viirs,
          round(avg(ratio_viirs_modis) FILTER (WHERE ratio_viirs_modis IS NOT NULL), 3) AS ratio_prom,
          round(sum(frp_total)) AS frp_total
        FROM read_parquet('{Path(out).as_posix()}')
    """).fetchall()
    print("filas | desde | hasta | conf_modis | conf_viirs | ratio_viirs/modis | FRP total")
    for r in rows:
        print(" | ".join(str(x) for x in r))


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--summary", action="store_true")
    a = p.parse_args()
    if a.summary:
        summary(); return
    out, n = harmonize()
    print(f"OK: {n} filas -> {out}")
    summary()


if __name__ == "__main__":
    main()