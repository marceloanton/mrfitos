# Billing & Trial Ops Runbook

## Endpoints actuales

- `POST /admin/subscription/tenant/{tenant_id}/start-trial`
- `POST /admin/subscription/process-expired-trials`
- `POST /admin/billing/checkout-session`
- `POST /billing/webhook/mercadopago`
- `POST /cron/subscription/process-expired-trials` (bearer token técnico)
- `POST /cron/billing/conversion-alert` (bearer token técnico)

## Variables de entorno backend

- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `MP_SUCCESS_URL`
- `MP_FAILURE_URL`
- `MP_PENDING_URL`
- `CRON_BEARER_TOKEN`

## Operación manual rápida

### Iniciar trial

```bash
curl -X POST http://localhost:8080/admin/subscription/tenant/1/start-trial \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"days":14}'
```

### Generar checkout Pro

```bash
curl -X POST http://localhost:8080/admin/billing/checkout-session \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":1,"plan_code":"pro"}'
```

### Generar checkout add-on

```bash
curl -X POST http://localhost:8080/admin/billing/checkout-session \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":1,"addon_code":"whatsapp"}'
```

### Simular webhook aprobado (modo local)

```bash
curl -X POST http://localhost:8080/billing/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"provider_reference":"mp_xxx","status":"approved"}'
```

### Ejecutar expiración por cron endpoint

```bash
curl -X POST http://localhost:8080/cron/subscription/process-expired-trials \
  -H "Authorization: Bearer <CRON_BEARER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## GitHub Actions diario

Workflow: `.github/workflows/process-expired-trials.yml`

Secrets requeridos:

- `APP_BASE_URL` (ej: `https://api.tu-dominio.com`)
- `CRON_BEARER_TOKEN` (igual al backend)

El job corre a diario y también manual (`workflow_dispatch`), con 3 reintentos y logs de respuesta.

## GitHub Actions diario (conversion alert)

Workflow: `.github/workflows/billing-conversion-alert.yml`

Secrets requeridos:

- `APP_BASE_URL` (ej: `https://api.tu-dominio.com`)
- `CRON_BEARER_TOKEN` (igual al backend)

Opcional:

- Repo variable `CONVERSION_ALERT_THRESHOLD` (porcentaje, default `35`)
- En ejecución manual (`workflow_dispatch`) podés enviar input `threshold` para override puntual.

El job corre a diario y también manual, con 3 reintentos, logging de HTTP/status y body.

### Test manual por cURL (local o prod)

```bash
curl -X POST http://localhost:8080/cron/billing/conversion-alert \
  -H "Authorization: Bearer <CRON_BEARER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"threshold":35}'
```

### Test manual desde GitHub Actions

1. Ir a `Actions` -> `Billing Conversion Alert`.
2. Click en `Run workflow`.
3. (Opcional) completar `threshold` (ej: `40`).
4. Verificar en logs: `Attempt`, `HTTP`, y body JSON de respuesta.

## Troubleshooting

- `401` en cron: token incorrecto o faltante.
- `503` en cron: `CRON_BEARER_TOKEN` no configurado en backend.
- webhook `422`: revisar firma (`MP_WEBHOOK_SECRET`) o payload.
- checkout sin URL real: revisar `MP_ACCESS_TOKEN` (si falta usa fallback mock).
