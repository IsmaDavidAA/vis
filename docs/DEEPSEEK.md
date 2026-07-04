# DeepSeek — métricas con IA

VIS puede generar hábitos personalizados según tus metas usando **DeepSeek** vía Edge Function (la API key nunca va en el frontend).

## Flujo

1. En **Confirmar plan** (onboarding), escribes tu meta por sección (ej. "Crear el hábito del gym").
2. Eliges dificultad:
   - **Sencillo** → 1 hábito/día
   - **Medio** → 2 hábitos/día
   - **Difícil** → 3 hábitos/día
3. Pulsas **Generar métricas** → DeepSeek propone hábitos concretos.
4. Puedes **editar**, **regenerar** (una o todas) o **quitar** un hábito — al quitar queda un slot vacío que debes rellenar. Siempre debes tener exactamente 1, 2 o 3 según la dificultad.
5. Al terminar el onboarding, se guardan en `user_metrics` y aparecen en **Métricas**, **Dashboard** y el calendario.

Sin API key, la app usa sugerencias locales (plantillas relacionadas con tu meta).

## Configuración

### 1. API key

Obtén una key en [platform.deepseek.com](https://platform.deepseek.com).

### 2. Migración SQL

Ejecuta en el SQL Editor de Supabase:

```sql
-- supabase/migrations/003_custom_metrics.sql
```

### 3. Secret en Supabase

```powershell
npx supabase login
npx supabase link --project-ref adwmdjqqysnivtjudrhm
npx supabase secrets set DEEPSEEK_API_KEY=sk-tu-key-aqui
```

### 4. Desplegar Edge Function

```powershell
npx supabase functions deploy generate-metrics
```

## Modo demo (local)

Sin Supabase o sin DeepSeek, el botón **Generar métricas** sigue funcionando con el fallback local (`src/lib/metricsAi.ts`).

## Seguridad

- `DEEPSEEK_API_KEY` solo en secrets de Supabase
- La función exige JWT de usuario autenticado (`verify_jwt = true`)
