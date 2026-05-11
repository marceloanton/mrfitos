# Guía Operativa Por Rol

## 1. Objetivo
- Estandarizar la operación diaria de la sede.
- Reducir errores de ejecución en recepción/caja.
- Acelerar onboarding de nuevo personal.
- Facilitar lectura de KPIs y decisiones rápidas.

## 2. Roles y Responsabilidades

### Gerente
- Supervisar KPIs de ingresos, asistencia y vencimientos.
- Tomar decisiones comerciales (upgrade, campañas, retención).
- Controlar cumplimiento de cierre operativo diario.

### Recepción
- Ejecutar check-in/check-out.
- Gestionar reservas y altas rápidas.
- Registrar pagos y resolver dudas básicas de socios.

### Operador
- Control de accesos e incidencias en puerta/sala.
- Soporte operativo durante picos de asistencia.
- Escalado de casos críticos a recepción/gerencia.

## 3. Onboarding Rápido (1 Día)

### Bloque 1: Setup (60 min)
- Login en plataforma.
- Verificar sede activa.
- Revisar permisos de usuario.
- Confirmar accesos a `Dashboard`, `Asistencia`, `Pagos`, `Socios`.

Checklist:
- Usuario creado y activo.
- Sede correcta seleccionada.
- Permisos mínimos por rol validados.

### Bloque 2: Flujo operativo base (120 min)
- Check-in de socio.
- Alta/edición de socio.
- Cobro mensualidad.
- Revisión de vencimientos del día.

Checklist:
- 3 check-ins de prueba.
- 1 pago registrado correctamente.
- 1 socio editado sin errores.

### Bloque 3: Cierre (60 min)
- Revisión rápida de métricas en dashboard.
- Export de reporte básico.
- Registro de incidencias del turno.

Checklist:
- Dashboard sin alertas críticas ignoradas.
- Reporte exportado.
- Incidencias registradas.

## 4. Flujos Diarios

### 4.1 Check-in (Recepción/Operador)
1. Buscar socio por nombre/código.
2. Validar estado de membresía.
3. Ejecutar check-in.
4. Si hay vencimiento, derivar a cobro.

Criterio objetivo:
- Check-in completo en <= 3 clics.

### 4.2 Reservas y Clases (Recepción)
1. Abrir agenda del día.
2. Revisar cupos disponibles.
3. Confirmar reserva o lista de espera.
4. Notificar al socio.

### 4.3 Cobros (Recepción)
1. Identificar deuda/mensualidad.
2. Registrar método de pago.
3. Confirmar estado final (`paid` / `pending` / `failed`).
4. Entregar comprobante y observación.

### 4.4 Cierre de Caja / Jornada (Recepción + Gerente)
1. Validar operaciones del día.
2. Revisar diferencias y anulaciones.
3. Cerrar sesión operativa.
4. Notificar resultados al gerente.

## 5. Resolución de Incidencias

### Caso A: Socio no puede ingresar
- Validar estado (`active`, `expired`, `paused`).
- Confirmar último pago.
- Si no se resuelve en 3 min, escalar a gerente.

### Caso B: Pago rechazado
- Reintentar método alternativo.
- Registrar observación.
- Ofrecer link de pago / recordatorio.

### Caso C: Saturación de aforo
- Priorizar turnos confirmados.
- Aplicar lista de espera.
- Notificar tiempo estimado.

## 6. KPIs Operativos y Acción

### Panel Gerente (diario)
- Ingresos del día.
- Asistencia diaria.
- Vencimientos en 24/72h.
- Conversión comercial (focus -> pitch -> checkout).

Acción sugerida:
- Si `Focus->Checkout` < 18%: revisar script comercial y segmentación.
- Si vencimientos suben 20% WoW: lanzar campaña WhatsApp.
- Si asistencia cae 15% WoW: activar promo de retención.

### Panel Recepción (turno)
- Check-ins por hora.
- Pagos procesados.
- Incidencias abiertas.

Acción sugerida:
- Si cola > 5 socios: activar modo check-in rápido.
- Si pagos `failed` > 10% del turno: derivar a métodos alternativos.

## 7. Material Visual Recomendado
- Mockup recepción: tablero con check-in + alertas + cobros.
- Mockup gerente: KPIs + semáforo comercial + prioridad del día.
- Mockup app usuario: reservas, estado de membresía, pagos.

Assets sugeridos:
- Iconografía lineal simple (`check`, `calendar`, `wallet`, `alert`).
- Fotos de sala con buena iluminación y uso real.
- Diagramas de flujo de 1 pantalla por proceso crítico.

## 8. SOPs (Procedimientos Estandarizados)

### SOP-01 Apertura de Sede
- Revisar sistema/logins.
- Confirmar personal asignado.
- Verificar estado de agenda y aforo.

### SOP-02 Operación de Turno
- Control de check-ins continuo.
- Escalado rápido de incidencias.
- Registro de novedades relevantes.

### SOP-03 Cierre de Jornada
- Revisión de cobros y diferencias.
- Export de resumen diario.
- Comunicación de resultados y pendientes.

## 9. Script de Demo Comercial (5 Minutos)
1. Mostrar Dashboard role-based.
2. Ejecutar check-in rápido.
3. Registrar cobro.
4. Mostrar Admin Billing con prioridades y guiones.
5. Cerrar con impacto: ahorro de tiempo + mejora conversión.

Mensaje final:
- “Menos fricción operativa, más cobros cerrados, más control por sede.”

## 10. Criterios de Aceptación
- Check-in operativo <= 3 clics.
- Flujo de cobro sin bloqueos en turno.
- Dashboard con acciones rápidas por rol.
- Guía usable por personal nuevo en primer día.

## 11. Próximos Pasos
1. Validar esta guía con 1 gerente y 1 recepción real.
2. Ajustar términos y flujo según feedback.
3. Publicar versión HTML/PDF para onboarding oficial.
