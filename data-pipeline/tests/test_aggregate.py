import sys
from pathlib import Path

import duckdb

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import aggregate  # noqa: E402


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    header = "latitude,longitude,acq_date,confidence,frp\n"
    path.write_text(header + "\n".join(rows) + "\n", encoding="utf-8")


def read(out):
    return duckdb.execute(
        "SELECT CAST(date AS VARCHAR), cell_lat, cell_lon, n_det, n_conf, frp_sum "
        f"FROM read_parquet('{out.as_posix()}') ORDER BY date"
    ).fetchall()


def test_modis_cuenta_confianza_y_frp(tmp_path):
    write_csv(tmp_path / "raw" / "MODIS_SP" / "a.csv", [
        "-12.01,-75.02,2020-01-01,80,10.0",
        "-12.02,-75.03,2020-01-01,20,5.0",   # confianza < 30: cuenta en n_det, no en n_conf
        "-12.01,-75.02,2020-01-02,50,2.5",
    ])
    out, n = aggregate.aggregate_source("MODIS_SP", tmp_path / "raw", tmp_path / "out", cell=0.25)
    assert n == 2
    dia1, dia2 = read(out)
    assert dia1 == ("2020-01-01", -12.125, -75.125, 2, 1, 15.0)
    assert dia2 == ("2020-01-02", -12.125, -75.125, 1, 1, 2.5)


def test_viirs_confianza_por_letra(tmp_path):
    write_csv(tmp_path / "raw" / "VIIRS_SNPP_SP" / "a.csv", [
        "-12.01,-75.02,2020-01-01,h,3.0",
        "-12.02,-75.03,2020-01-01,l,1.0",    # 'l' no cuenta en n_conf
        "-12.01,-75.02,2020-01-01,n,2.0",
    ])
    out, n = aggregate.aggregate_source("VIIRS_SNPP_SP", tmp_path / "raw", tmp_path / "out", cell=0.25)
    assert n == 1
    assert read(out)[0] == ("2020-01-01", -12.125, -75.125, 3, 2, 6.0)