# POS Critical Alerts Cron

Este cron dispara el flujo de alerta crítica POS con cooldown usando el endpoint backend.

## Endpoint

- `POST /cron/pos/alerts/dispatch`
- Seguridad: `CronTokenMiddleware` (header `X-Cron-Token`)

## Body (opcional)

```json
{
  "tenant_id": 1,
  "gym_id": 1,
  "date_from": "2026-05-10",
  "date_to": "2026-05-10",
  "difference_threshold": 0,
  "voids_threshold": 3,
  "cooldown_minutes": 60,
  "contact_id": 2,
  "phone": "54911..."
}
```

Si `tenant_id` y `gym_id` no se envían, en MVP usa fallback `tenant_id=1`, `gym_id=1`.

## Ejemplo cURL

```bash
curl -X POST "http://localhost:8080/cron/pos/alerts/dispatch" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Token: TU_CRON_TOKEN" \
  -d "{\"tenant_id\":1,\"gym_id\":1,\"cooldown_minutes\":60}"
```

## Script PowerShell local

En la raíz del repo se agregó:

- `run-pos-alerts-cron.ps1`

Ejemplo:

```powershell
$env:CRON_BEARER_TOKEN="TU_CRON_TOKEN"
.\run-pos-alerts-cron.ps1 -BaseUrl "http://localhost:8080" -TenantId 1 -GymId 1 -CooldownMinutes 60
```

## Respuesta esperada

```json
{
  "success": true,
  "data": {
    "tenant_id": 1,
    "gym_id": 1,
    "dispatched": false,
    "reason": "not_critical"
  }
}
```

## Frecuencia sugerida

- Cada 15 minutos para operación estándar.
- Cada 5 minutos para gimnasios de alto volumen.
