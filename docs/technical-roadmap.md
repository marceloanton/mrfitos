# Technical Roadmap - GymSaaS MVP

## Fase 1 (prioridad alta)

- Completar autenticacion:
  - refresh token
  - recuperacion de password
  - RBAC por rol y permiso
- Base multi-tenant estricta:
  - middleware de permisos
  - policies por modulo
- Frontend shell:
  - layout principal
  - navegación por modulos
  - estado global de sesion

## Fase 2

- Modulo Socios:
  - CRUD
  - vencimientos
  - observaciones
- Modulo Planes:
  - semanal/mensual/personalizado
- Modulo Pagos:
  - efectivo/transferencia/mercadopago
  - historial y filtros

## Fase 3

- Dashboard real con metricas desde API
- Asistencia QR (check-in rapido)
- Integracion WhatsApp (links + plantillas)

## Fase 4

- Hardening:
  - rate limiting
  - auditoria completa
  - mejoras validacion/sanitizacion
- Testing:
  - pruebas API
  - pruebas flujos frontend
- Deploy:
  - pipeline build frontend
  - checklist de release
  - backups DB

## Definicion de hecho por modulo

- Endpoints documentados
- Validacion backend completa
- Filtros tenant/gym obligatorios
- UI responsive
- Manejo de errores y loading
- Pruebas basicas ejecutadas
