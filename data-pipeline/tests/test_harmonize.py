import sys
from pathlib import Path
import duckdb
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import harmonize  # noqa: E402


def _rows(out):
    return duckdb.execute(
        "SELECT cell_lat, n_conf_modis, n_conf_viirs, n_conf_total, ratio_viirs_modis "
        f"FROM read_parquet('{out.as_posix()}') ORDER BY cell_lat"
    ).fetchall()


def test_harmonize_une_modis_y_viirs(tmp_path):
    duckdb.execute(f"""COPY (SELECT DATE '2020-01-01' AS date, -12.125 AS cell_lat,
        -75.125 AS cell_lon, 2 AS n_det, 1 AS n_conf, 10.0 AS frp_sum)
        TO '{(tmp_path/'daily_cells_MODIS_SP.parquet').as_posix()}' (FORMAT PARQUET)""")
    duckdb.execute(f"""COPY (SELECT DATE '2020-01-01' AS date, -12.125 AS cell_lat,
        -75.125 AS cell_lon, 3 AS n_det, 2 AS n_conf, 5.0 AS frp_sum)
        TO '{(tmp_path/'daily_cells_VIIRS_SNPP_SP.parquet').as_posix()}' (FORMAT PARQUET)""")
    out, n = harmonize.harmonize(tmp_path, tmp_path / "harm.parquet")
    assert n == 1
    row = _rows(out)[0]
    assert (row[1], row[2], row[3], float(row[4])) == (1, 2, 3, 2.0)


def test_harmonize_celda_solo_en_una_fuente(tmp_path):
    duckdb.execute(f"""COPY (SELECT DATE '2020-01-01' AS date, 0.125 AS cell_lat,
        0.125 AS cell_lon, 1 AS n_det, 1 AS n_conf, 2.0 AS frp_sum)
        TO '{(tmp_path/'daily_cells_MODIS_SP.parquet').as_posix()}' (FORMAT PARQUET)""")
    duckdb.execute(f"""COPY (SELECT DATE '2020-01-01' AS date, 0.375 AS cell_lat,
        0.375 AS cell_lon, 4 AS n_det, 3 AS n_conf, 8.0 AS frp_sum)
        TO '{(tmp_path/'daily_cells_VIIRS_SNPP_SP.parquet').as_posix()}' (FORMAT PARQUET)""")
    out, n = harmonize.harmonize(tmp_path, tmp_path / "harm.parquet")
    assert n == 2
    r0, r1 = _rows(out)
    # celda solo MODIS: MODIS=1, VIIRS=0 -> ratio 0.0 (denominador existe, numerador 0)
    assert (r0[1], r0[2], r0[3], float(r0[4])) == (1, 0, 1, 0.0)
    # celda solo VIIRS: MODIS=0 -> sin denominador -> ratio None
    assert (r1[1], r1[2], r1[3], r1[4]) == (0, 3, 3, None)