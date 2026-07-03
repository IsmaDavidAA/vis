# VIS

Web de productividad para ordenar tu **segunda mitad del año** — desde julio hasta diciembre.

> Diciembre no se construye en diciembre. Se construye con lo que decides sostener desde julio.

## Qué hace

- **Inicio de sesión** — auth con Supabase (o modo demo sin backend)
- **Onboarding guiado** — 8 pasos basados en el framework "Segunda Mitad":
  - Salud y cuerpo
  - Dinero
  - Algo que quieres aprender
  - Relaciones
  - Algo que quieres dejar
  - No negociables por mes
  - Visión del 31 de diciembre
  - Persona de accountability
- **Gamificación** — barra de vidas, puntos, estrellas ⭐ al cumplir, cara enojada 😤 al fallar
- **Leaderboard** — compite con otros por puntos
- **Premios** — el ganador elige su recompensa

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Supabase (auth + PostgreSQL)
- GitHub Actions → GitHub Pages

## Inicio rápido

```bash
# Instalar dependencias
npm install

# Desarrollo (modo demo sin Supabase)
npm run dev

# Build de producción
npm run build
```

Abre [http://localhost:5173](http://localhost:5173).

## Conectar Supabase

Ver [docs/SUPABASE.md](docs/SUPABASE.md) para la guía completa.

```bash
cp .env.example .env
# Edita .env con tus credenciales de Supabase
```

## Deploy

El proyecto se despliega automáticamente a GitHub Pages en cada push a `main`:

1. Habilita **GitHub Pages** con source "GitHub Actions"
2. Agrega secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. Push a `main` → deploy automático

## Estructura

```
src/
├── components/     # UI gamificada (cards, life bar, feedback icons)
├── context/        # Auth context (Supabase + demo fallback)
├── data/           # Constantes, mensajes, categorías de metas
├── lib/            # Cliente Supabase + localStorage demo store
├── pages/          # Landing, auth, onboarding, dashboard, etc.
└── types/          # TypeScript types
supabase/
└── schema.sql      # Schema completo con RLS
docs/
└── SUPABASE.md     # Guía de conexión
```

## Modo demo

Sin configurar Supabase, la app funciona en **modo demo** guardando todo en `localStorage`. Ideal para probar el flujo completo antes de conectar el backend.

## Licencia

Privado — Nexion
