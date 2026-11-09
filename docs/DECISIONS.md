# Decisiones

- DuckDB + Parquet: no requiere servidor de base de datos, es fácil de correr y de demostrar.
- Ramas: main (estable), develop (integración), feat/<nombre>/<tema> (trabajo).
- Grilla de 0.25 grados (~27 km): los conteos por celda son estables al comparar MODIS (1 km) con VIIRS (375 m). El tamaño es un parámetro (`--cell` en aggregate.py).
- Se guardan `n_det` (todas las detecciones) y `n_conf` (confianza nominal o alta) por separado, porque la confianza de MODIS (0-100) y la de VIIRS (letras) no son comparables. Se decide cuál usar en la armonización.
- Un Parquet por fuente (`data/processed/daily_cells_<FUENTE>.parquet`): permite agregar MODIS mientras VIIRS sigue descargando.