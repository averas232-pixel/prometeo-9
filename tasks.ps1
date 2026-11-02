param([Parameter(Mandatory)][ValidateSet('setup','data','api','web')][string]$task)
# Atajos para Windows. Ajustar las rutas conforme existan los archivos reales.
switch ($task) {
  'setup' {
    python -m venv .venv
    .\.venv\Scripts\pip install -r backend\requirements.txt
    Push-Location frontend; npm install; Pop-Location
  }
  'data' { .\.venv\Scripts\python data-pipeline\run.py }
  'api'  { Push-Location backend; ..\.venv\Scripts\uvicorn app.main:app --reload; Pop-Location }
  'web'  { Push-Location frontend; npm run dev; Pop-Location }
}