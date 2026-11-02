# Datos

## Fuente
NASA FIRMS (Fire Information for Resource Management System), API de área.
Se necesita una clave gratuita (MAP_KEY) guardada en `.env` (nunca en Git).

## Sensores
| Fuente FIRMS | Qué es | Resolución |
|---|---|---|
| MODIS_SP | MODIS Terra y Aqua, procesamiento estándar (histórico) | 1 km |
| VIIRS_SNPP_SP | VIIRS Suomi-NPP, procesamiento estándar | 375 m |
| VIIRS_NOAA20_SP | VIIRS NOAA-20, procesamiento estándar | 375 m |
| *_NRT | Casi tiempo real, para lo más reciente | igual |

SP llega con retraso respecto a NRT. Usar `--check` para ver hasta qué fecha hay datos.

## Cómo reproducir la descarga
    .\.venv\Scripts\python data-pipeline\firms_download.py --check
    .\.venv\Scripts\python data-pipeline\firms_download.py --source MODIS_SP --start 2020-01-01 --end 2020-01-31

Los CSV quedan en `data/raw/<FUENTE>/` (ignorado por Git). El script es reanudable.

## Límites
- 5000 transacciones cada 10 minutos por clave.
- Consultas de pocos días: el script usa tramos de 5 días.

## Advertencias para el análisis
- La confianza no está en la misma escala: MODIS numérica (0-100), VIIRS por letra.
- El bbox de Perú incluye zonas de países vecinos; se recorta después por AOI.
- Por su mayor resolución, VIIRS detecta más fuegos pequeños: los conteos no se
  pueden sumar con los de MODIS sin armonizar (ese es el reto).
## Disponibilidad (consultada el 2026-11-02 con --check)
| Fuente | Desde | Hasta |
|---|---|---|
| MODIS_SP | 2000-11-01 | 2026-08-31 |
| MODIS_NRT | 2026-09-01 | 2026-11-02 |
| VIIRS_SNPP_SP | 2012-01-20 | 2026-07-31 |
| VIIRS_NOAA20_SP | 2018-04-01 | 2026-07-31 |
| VIIRS_NOAA21_SP | 2023-03-01 | 2026-07-31 |
| VIIRS_*_NRT | 2026-08-01 (NOAA-21: 2024-01-17) | 2026-11-02 |

Traslape principal MODIS vs VIIRS (S-NPP): 2012-01-20 a 2026-07-31.