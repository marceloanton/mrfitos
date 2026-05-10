# Deploy Checklist (Production)

## 1. Environment
- Copy `backend/.env.production.example` to `backend/.env` and set real secrets.
- Copy `frontend/.env.production.example` to frontend production env.
- Confirm `CORS_ALLOWED_ORIGINS` includes only trusted domains.

## 2. Database
- Backup MySQL.
- Apply `backend/database/migrations/2026_05_07_deploy_readiness.sql`.
- Validate required tables exist: `whatsapp_batches`, `whatsapp_batch_items`.

## 3. Backend
- PHP 8.2+ installed with `pdo_mysql`.
- Web root points to `backend/public`.
- Verify health endpoint: `GET /health`.
- Verify auth/login with superadmin.

## 4. Frontend
- Build: `npm run build` in `frontend`.
- Publish `frontend/dist` behind HTTPS.
- Confirm API base URL points to production backend.

## 5. Security
- Rotate `APP_KEY` and DB credentials.
- Disable debug (`APP_DEBUG=false`).
- Restrict CORS to exact origins.
- Enforce HTTPS and HSTS at reverse proxy.

## 6. Smoke Tests
- Public pricing cache regression: `GET /public/pricing` returns `200` with `ETag` + `Cache-Control`, and conditional request with `If-None-Match` returns `304` (optional `If-Modified-Since` check when `Last-Modified` exists).
- Login + dashboard metrics.
- Members/Plans/Memberships/Payments CRUD.
- Attendance check-in/check-out.
- WhatsApp reminders list + batch generation.
- Reports renewals + CSV export.
