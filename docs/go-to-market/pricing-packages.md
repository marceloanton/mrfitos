# MRAnalytics GymSaaS - Pricing Packages

## Objetivo comercial

Lanzar rápido con una oferta simple:
- `Free` para captación.
- `Pro` para operación completa.
- `Add-ons` para expandir ARPU sin complejidad inicial.

## Matriz de planes

| Bloque | Free | Pro |
|---|---|---|
| Sedes incluidas | 1 | 3 (expandible) |
| Usuarios staff | 1 | 10 |
| Socios activos | 80 | 1000 |
| Dashboard básico | Sí | Sí |
| Socios (alta/edición/búsqueda) | Sí | Sí |
| Pagos + historial | Sí | Sí |
| Asistencia QR | Limitado | Completo |
| WhatsApp recordatorios | No | Sí |
| Reportes comerciales | Básico | Avanzado |
| Soporte | Comunidad | Prioritario |

## Catálogo de add-ons (pagos)

| Add-on | Precio sugerido mensual | Descripción |
|---|---:|---|
| WhatsApp Pro | USD 9 | Recordatorios automáticos, plantillas y envío por lote. |
| Reportes BI | USD 12 | KPIs extendidos, exportación y comparativas mensuales. |
| Multi-sede Plus | USD 15 | Sedes extra por encima del límite del plan. |
| Staff Plus | USD 6 | Paquete adicional de usuarios internos. |
| Marca Blanca | USD 19 | Personalización de marca y dominio comercial. |

## Flujo de monetización operativo (admin)

Desde `Admin > Suscripciones`:
- Iniciar trial de 14 días por tenant (`Start Trial`).
- Generar checkout para upgrade a `Pro`.
- Generar checkout para activación de add-on.
- Ejecutar `Process Expired Trials` para forzar vencimientos y downgrade controlado.

## Recomendación de lanzamiento (30 días)

- Oferta: `Pro` con 20% off por 3 meses + 1 add-on bonificado (a elección).
- Condición: pago mensual automático.
- Mensaje comercial:
  - "Implementación inmediata, sin costo de setup en lanzamiento."
  - "Migración de datos básica incluida."
  - "Cancelación simple, sin permanencia anual."

## Reglas operativas recomendadas

- El tenant en `Free` puede activar add-ons solo en modalidad trial para acelerar upgrade.
- Add-ons de uso intensivo (ej. WhatsApp Pro) deben exigir plan `Pro` para habilitación permanente.
- Mantener precios en moneda local y USD de referencia para evitar fricción comercial.
- Correr `Process Expired Trials` al menos 1 vez por día hábil o como parte de checklist de cierre.
