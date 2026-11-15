# Arquitectura

```mermaid
flowchart LR
  A[FIRMS archivo MODIS/VIIRS] --> B[ingest]
  B --> C[aggregate: diario por celda]
  C --> D[harmonize: VIIRS a equivalente MODIS]
  D --> E[anomalías y períodos críticos]
  E --> F[API FastAPI]
  F --> G[Frontend React + MapLibre]
```

## Módulos
- `data-pipeline/`: ingesta, agregación, armonización y anomalías (Python)
- `backend/`: API (FastAPI + DuckDB)
- `frontend/`: app web (React + TypeScript + Vite + MapLibre)