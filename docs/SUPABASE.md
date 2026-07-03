# VIS — Conectar Supabase

Guía paso a paso para conectar VIS con Supabase.

## 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) e inicia sesión.
2. Crea un nuevo proyecto (elige región cercana).
3. Espera a que termine de provisionarse (~2 min).

## 2. Ejecutar el schema

1. En el dashboard, ve a **SQL Editor**.
2. Copia todo el contenido de [`supabase/schema.sql`](../supabase/schema.sql).
3. Pégalo y ejecuta (**Run**).

Esto crea las tablas, políticas RLS, triggers y datos iniciales de premios.

## 3. Obtener credenciales

1. Ve a **Project Settings → API**.
2. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

## 4. Configurar variables de entorno

### Desarrollo local

```bash
cp .env.example .env
```

Edita `.env`:

```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### GitHub Actions (producción)

En tu repo de GitHub:

1. **Settings → Secrets and variables → Actions**
2. Agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 5. Configurar Auth en Supabase

1. Ve a **Authentication → Providers**.
2. Asegúrate de que **Email** esté habilitado.
3. En **Authentication → URL Configuration**, agrega tu URL de producción:
   - Site URL: `https://tu-usuario.github.io/vis/`
   - Redirect URLs: `https://tu-usuario.github.io/vis/**`

## 6. Habilitar GitHub Pages

1. En GitHub: **Settings → Pages**
2. Source: **GitHub Actions**
3. El workflow `.github/workflows/deploy.yml` se encarga del resto.

## 7. Verificar conexión

```bash
npm run dev
```

- Si las variables están configuradas → modo Supabase (datos en la nube).
- Si no → modo demo (datos en localStorage del navegador).

## Tablas creadas

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Perfil, estado actual, visión de diciembre, accountability |
| `goals` | Metas por categoría (salud, dinero, etc.) |
| `monthly_non_negotiables` | Una meta no negociable por mes |
| `checkins` | Check-ins diarios con puntos |
| `user_stats` | Puntos, vidas, racha, estrellas |
| `prizes` | Premios que el ganador puede elegir |
| `user_metrics` | Métricas activas del usuario (cepillarse, dormir, etc.) |
| `metric_entries` | Registro diario de cada métrica |
| `shared_snapshots` | Progreso público para compartir con código |

### Métricas y compartir

Ejecuta también [`supabase/migrations/001_metrics_sharing.sql`](../supabase/migrations/001_metrics_sharing.sql) para habilitar métricas y códigos de compartir.

## Modo demo vs Supabase

La app detecta automáticamente si Supabase está configurado:

```typescript
// src/lib/supabase.ts
export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('tu-proyecto')
)
```

- **Demo**: funciona sin backend, ideal para probar el flujo completo.
- **Supabase**: datos persistentes, multi-usuario, leaderboard real.

## Troubleshooting

| Problema | Solución |
|----------|----------|
| "Invalid API key" | Verifica que copiaste la **anon key**, no la service role |
| Login no redirige | Agrega tu URL en Supabase Auth → URL Configuration |
| RLS bloquea queries | Verifica que el usuario esté autenticado (`auth.uid()`) |
| Build falla en CI | Confirma que los secrets están en GitHub Actions |
