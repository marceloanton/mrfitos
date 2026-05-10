# POS Critical Alerts Cron

Este cron dispara el flujo de alerta crítica POS con cooldown usando el endpoint backend.

## Endpoint

- `POST /cron/pos/alerts/dispatch`
- Seguridad: `CronTokenMiddleware` (header `X-Cron-Token`)

## Modos de ejecución

- `single`: enviando `tenant_id` + `gym_id`.
- `bulk`: sin `tenant_id` ni `gym_id`, procesa todas las sedes activas.

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
Si no se envían, el endpoint puede ejecutarse en modo masivo (`bulk`) sobre sedes activas.

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

## Script BAT (doble click)

También se agregó:

- `run-pos-alerts-cron.bat`

Requiere variable de entorno `CRON_BEARER_TOKEN` configurada en Windows.

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

## Respuesta en modo bulk

```json
{
  "success": true,
  "data": {
    "mode": "bulk",
    "processed": 3,
    "dispatched": 1,
    "skipped": 2,
    "items": [
      { "tenant_id": 1, "gym_id": 1, "dispatched": false, "reason": "not_critical", "level": "ok" },
      { "tenant_id": 1, "gym_id": 2, "dispatched": true, "level": "critical" }
    ]
  }
}
```

## Frecuencia sugerida

- Cada 15 minutos para operación estándar.
- Cada 5 minutos para gimnasios de alto volumen.
