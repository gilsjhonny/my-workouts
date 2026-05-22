# Mis Entrenos — Workout Tracker

Web app (mobile-first) para visualizar tu historial de entrenamientos desde un CSV exportado por Hevy u otra app con el mismo esquema.

- Importa el CSV, agrupa por rutina, muestra el detalle por sesión y por ejercicio
- Compara series contra la sesión anterior (delta de peso, reps, RIR)
- Carpetas para agrupar rutinas
- Pantalla de ejercicio con stats (mejor peso, mejor reps×peso) y gráfico de evolución
- Renombrado de ejercicios y rutinas con persistencia local
- Todo se guarda en `localStorage` del navegador — no hay backend

## Ejecutar local

Es HTML/CSS/JSX estático. Ábrelo con cualquier servidor estático:

```bash
npx serve .
# o
python3 -m http.server 8000
```

## Deploy en Vercel

1. Sube este folder a GitHub.
2. En vercel.com → **New Project** → importa el repo.
3. Framework Preset: **Other**. No hace falta build command ni output directory.
4. **Deploy**.

Vercel sirve los archivos estáticos directamente. La primera carga compila JSX en el navegador con Babel (es lento la primera vez por el bundle de Babel, ~200ms). Si quieres un build precompilado más adelante, se puede migrar a Vite.

## Privacidad

Si subes `sample_data.csv` con tus datos personales al repo público, **será visible**. Está en `.gitignore` por defecto. Cárgalo manualmente desde la pantalla de importar o usa el demo de localStorage.
