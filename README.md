# GymSaaS - SaaS Fitness Platform (MVP)

Plataforma SaaS multi-tenant para gimnasios con frontend React + backend PHP API REST.

## Estado actual

Base funcional implementada:
- Arquitectura frontend/backend desacoplada.
- Esquema SQL multi-tenant.
- Autenticacion JWT con aislamiento `tenant_id` + `gym_id`.
- Dashboard y login en React.
- Modulo de **Socios** funcional (backend + frontend): listado, detalle, alta, edicion y baja.
- Modulo de **Planes** funcional (backend + frontend): listado, detalle, alta, edicion y baja.
- Modulo de **Membresias** funcional (backend + frontend): listado, detalle, alta, edicion y baja, con filtro por estado.
- Modulo de **Pagos** funcional (backend + frontend): listado, detalle, alta, edicion y baja, con filtro por metodo.
- Modulo de **Asistencia** funcional (backend + frontend): listado, check-in y check-out.
- Modulo de **WhatsApp recordatorios** funcional (backend): listado de vencimientos para envio de recordatorios.

## Stack

- Frontend: React 19, Vite, TailwindCSS, React Router, Zustand, Axios.
- Backend: PHP 8.3+ (REST JSON).
- Database: MySQL/MariaDB.

## Estructura del repositorio

```txt
/frontend
  /src
    /components
    /pages
    /layouts
    /modules
    /hooks
    /services
    /stores
    /routes
    /utils
    /assets

/backend
  /app
    /Controllers
    /Services
    /Repositories
    /DTOs
  /core
  /modules
  /routes
  /config
  /storage
  /database
  /middleware
  /helpers
  /tests
  /public
```

## Requisitos

- Node.js 20+
- npm 10+
- PHP 8.3+
- MySQL 8+ o MariaDB 10.5+

## Instalacion local

1. Frontend

```bash
cd frontend
npm install
npm run dev
```

2. Backend

```bash
cd backend
cp .env.example .env
# configurar credenciales DB y APP_KEY
```

Servir backend con Apache/Nginx apuntando a `backend/public`.

3. Base de datos

Aplicar el esquema:

- `backend/database/schema.sql`

## Variables de entorno

Frontend (`frontend/.env`):

```bash
VITE_API_BASE_URL=http://localhost:8080
```

Backend (`backend/.env`):

```bash
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8080
APP_KEY=change_this_secret
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gymsaas
DB_USERNAME=root
DB_PASSWORD=
JWT_TTL=3600
```

## Endpoints actuales (Auth, Members, Plans, Memberships, Payments, Attendance, WhatsApp Reminders)

- `GET /health`
- `POST /auth/login`
- `POST /auth/switch-gym` (Auth middleware)
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me` (Auth + Tenant middleware)

## Flujo multi-sede (multi-gym)

El sistema soporta usuarios con acceso a multiples sedes (`gym_id`) dentro del mismo `tenant_id`.

- En `POST /auth/login`, la sesion/token devuelve:
  - `gym_id` activo (sede seleccionada inicialmente).
  - `available_gyms` con el listado de sedes habilitadas para el usuario.
- El frontend debe usar `available_gyms` para renderizar un selector de sede global.
- Cuando el usuario cambia de sede en UI, el frontend llama a `POST /auth/switch-gym` para actualizar el contexto activo.
- La respuesta de `POST /auth/switch-gym` devuelve el nuevo contexto (token/sesion) con el `gym_id` activo actualizado.
- A partir de ese cambio, todas las llamadas protegidas deben operar con el nuevo contexto de sede.

### `POST /auth/switch-gym`

Permite cambiar la sede activa del usuario autenticado sin reloguear.

Request JSON (ejemplo):

```json
{
  "gym_id": 3
}
```

Validaciones esperadas:

- Usuario autenticado.
- El `gym_id` solicitado debe existir en `available_gyms` del usuario.
- Si no tiene acceso a la sede solicitada, responder `403 Forbidden`.

### Members (`/members`)

- `GET /members` (Auth + Tenant + `members.read`)
- `GET /members/{id}` (Auth + Tenant + `members.read`)
- `POST /members` (Auth + Tenant + `members.write`)
- `PUT /members/{id}` (Auth + Tenant + `members.write`)
- `DELETE /members/{id}` (Auth + Tenant + `members.delete`)

### Plans (`/plans`)

- `GET /plans` (Auth + Tenant + `plans.read`)
- `GET /plans/{id}` (Auth + Tenant + `plans.read`)
- `POST /plans` (Auth + Tenant + `plans.write`)
- `PUT /plans/{id}` (Auth + Tenant + `plans.write`)
- `DELETE /plans/{id}` (Auth + Tenant + `plans.delete`)

### Memberships (`/memberships`)

- `GET /memberships` (Auth + Tenant + `memberships.read`)
- `GET /memberships/{id}` (Auth + Tenant + `memberships.read`)
- `POST /memberships` (Auth + Tenant + `memberships.write`)
- `PUT /memberships/{id}` (Auth + Tenant + `memberships.write`)
- `DELETE /memberships/{id}` (Auth + Tenant + `memberships.delete`)

### Payments (`/payments`)

- `GET /payments` (Auth + Tenant + `payments.read`)
- `GET /payments/{id}` (Auth + Tenant + `payments.read`)
- `POST /payments` (Auth + Tenant + `payments.write`)
- `PUT /payments/{id}` (Auth + Tenant + `payments.write`)
- `DELETE /payments/{id}` (Auth + Tenant + `payments.delete`)

### Attendance (`/attendance`)

- `GET /attendance` (Auth + Tenant + `attendance.read`)
- `POST /attendance/check-in` (Auth + Tenant + `attendance.write`)
- `POST /attendance/check-out` (Auth + Tenant + `attendance.write`)

### WhatsApp Reminders (`/reminders`)

- `GET /reminders/expirations` (Auth + Tenant + `whatsapp.read`)

## RBAC requerido

Para operar los modulos funcionales actuales, el usuario autenticado debe tener permisos explicitos:

- Socios:
  - `members.read` para consultar listado y detalle.
  - `members.write` para crear y editar.
  - `members.delete` para eliminar.
- Planes:
  - `plans.read` para consultar listado y detalle.
  - `plans.write` para crear y editar.
  - `plans.delete` para eliminar.
- Membresias:
  - `memberships.read` para consultar listado y detalle.
  - `memberships.write` para crear y editar.
  - `memberships.delete` para eliminar.
- Pagos:
  - `payments.read` para consultar listado y detalle.
  - `payments.write` para crear y editar.
  - `payments.delete` para eliminar.
- Asistencia:
  - `attendance.read` para consultar listado.
  - `attendance.write` para registrar check-in y check-out.
- WhatsApp recordatorios:
  - `whatsapp.read` para consultar vencimientos a notificar.

Todos estos endpoints ademas requieren validacion de tenant/gym via middlewares de autenticacion y contexto.

## Estado de modulos nuevos

- Membresias:
  - Backend: controlador, servicio, repositorio y rutas CRUD protegidas por RBAC.
  - Frontend: pagina `/memberships`, item de navegacion condicionado por permiso, listado con filtro de estado y formulario de alta/edicion/baja.
- Pagos:
  - Backend: controlador, servicio, repositorio y rutas CRUD protegidas por RBAC.
  - Frontend: pagina `/payments`, item de navegacion condicionado por permiso, listado con filtro por metodo y formulario de alta/edicion/baja.
- Asistencia:
  - Backend: controlador, servicio, repositorio y rutas protegidas por RBAC para listado, check-in y check-out.
  - Frontend: pagina `/attendance`, item de navegacion condicionado por permiso, listado y acciones de check-in/check-out.
- WhatsApp recordatorios:
  - Backend: endpoint protegido por RBAC para consultar vencimientos (`GET /reminders/expirations`).

## Modulos MVP objetivo

- Autenticacion (login/logout/recuperacion)
- Dashboard
- Socios (funcional)
- Planes (funcional)
- Membresias (funcional)
- Pagos (funcional)
- Asistencia (funcional)
- Configuracion
- WhatsApp recordatorios

## Seguridad base

- JWT firmado por `APP_KEY`.
- Validacion de `X-Tenant-Id` y `X-Gym-Id` en backend.
- Consultas preparadas (PDO).
- Nunca confiar en contexto enviado por frontend sin validar token/permisos.

## Documentacion adicional

- Roadmap tecnico: `docs/technical-roadmap.md`

## WhatsApp Batch (Update)

- `GET /reminders/expirations` (Auth + Tenant + `whatsapp.read`)
- `POST /reminders/batch` (Auth + Tenant + `whatsapp.send`)
- El batch registra auditoría en `activity_logs` con acción `whatsapp_batch_generated`.

## Deploy Readiness

- Backend prod env: `backend/.env.production.example`
- Frontend prod env: `frontend/.env.production.example`
- Incremental SQL migration: `backend/database/migrations/2026_05_07_deploy_readiness.sql`
- Production checklist: `docs/deploy/production-checklist.md`

## Automated Release (Windows/XAMPP)

Script: `release.ps1`

Runs:
- PHP syntax checks
- Frontend production build
- MySQL backup
- Incremental migration (`2026_05_07_deploy_readiness.sql`)
- API health check (`/health`)

Example:

```powershell
.\release.ps1 -DbName gymsaas -DbUser root -DbPassword "" -ApiBaseUrl http://localhost:8080
```

Optional flags:
- `-SkipBackup`
- `-SkipBuild`

## Strict Production Release

Script: `release-prod.ps1`

What it enforces:
- `APP_ENV=production`
- `APP_DEBUG=false`
- non-empty `APP_KEY`
- non-empty `DB_PASSWORD`
- `CORS_ALLOWED_ORIGINS` without localhost/127.0.0.1
- mandatory DB backup before migration
- explicit confirmation (`RELEASE`) unless `-AutoApprove`

Example:

```powershell
.\release-prod.ps1 -DbName gymsaas -DbUser root -DbPassword "SECRET" -ApiBaseUrl https://api.tu-dominio.com
```

CI-style (no prompt):

```powershell
.\release-prod.ps1 -DbName gymsaas -DbUser root -DbPassword "SECRET" -ApiBaseUrl https://api.tu-dominio.com -AutoApprove
```

Release evidence JSON files are generated in: `release-reports/`

## QA Smoke Script

Script: `smoke.ps1`

Checks:
- `/health`
- `/auth/login`
- `/auth/me`
- `/dashboard/metrics`
- `/members`
- `/attendance`
- `/reminders/expirations`
- `/reports/renewals`

Outputs JSON evidence to: `release-reports/`

Example:

```powershell
.\smoke.ps1 -ApiBaseUrl http://localhost:8080 -Email admin@manager.net.ar -Password Admin123!
```

## QA Gate

Script: `qa-gate.ps1`

Runs in sequence:
1. `release.ps1`
2. `smoke.ps1`

Then validates JSON evidence in `release-reports/` and fails if either report has `success=false`.

Example (fast local):

```powershell
.\qa-gate.ps1 -ApiBaseUrl http://localhost:8080 -Email admin@manager.net.ar -Password Admin123! -SkipBackup -SkipBuild
```

## Monetization Core (Free/Pro)

Implemented backend subscription gating:
- Tables: `subscription_plans`, `tenant_subscriptions`
- Middleware: `FeatureGateMiddleware`
- Service: `SubscriptionService`
- Route-level plan gating:
  - Reports (`features.reports`)
  - WhatsApp read/send (`features.whatsapp_read`, `features.whatsapp_send`)
  - Dashboard (`features.dashboard`)
- Free plan limit example:
  - `max_members=80` enforced on member creation (`POST /members`)

Default seed:
- `tenant_id=1` assigned to `free` plan unless active subscription exists.
