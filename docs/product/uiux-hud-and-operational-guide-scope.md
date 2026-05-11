# UI/UX HUD + Guía Operativa

## Objetivos
- Definir y construir una interfaz **role-based** para Sede (`Admin`, `Recepción`, `Gerente`) y Usuario (app móvil/web).
- Crear widgets de operación diaria enfocados en velocidad de ejecución (`check-in`, reservas, clases, cobros, aforo, reportes rápidos).
- Generar una **Guía Operativa interactiva** por rol para onboarding, operación y resolución de incidencias.

## Alcance Propuesto

### Skill 1: UI/UX HUD (Core)
- Objetivo: operaciones diarias + ventas.
- Alcance: panel sede, app usuario, HUD recepción.
- Entregables:
  - especificaciones UI
  - componentes React/Tailwind
  - hooks de API
  - prototipos Figma
- Prioridad: Alta.

### Skill 2: Guía Operativa (Doc Generator)
- Objetivo: formación y onboarding.
- Alcance: manual por rol, imágenes, SOPs.
- Entregables:
  - guía PDF/HTML
  - plantillas de entrenamiento
  - listado de assets
- Prioridad: Media-Alta.

## Componentes Clave UI/UX HUD
- Vistas role-based:
  - Gerente: KPIs, ingresos, ocupación.
  - Recepción: check-in rápido, reservas, cobros.
  - Operador: control de accesos, incidencias.
- Widgets diarios:
  - reservas próximas
  - check-ins en tiempo real
  - alertas de capacidad
  - ventas del día
  - tareas pendientes
- Patrones UI:
  - tarjetas de información
  - filtros por sede
  - tablas con acciones inline
  - paleta accesible (contraste WCAG)
- Stack sugerido:
  - React + TypeScript + Tailwind + shadcn/ui
  - Figma para prototipos
  - endpoints REST/GraphQL multi-sede

## Entregables Técnicos
- Spec funcional en JSON:
  - endpoints
  - eventos
  - roles
  - permisos
- Kit de componentes en Storybook:
  - botones
  - tablas
  - modales
  - widgets HUD
- Prototipos Figma:
  - recepción
  - agenda
  - perfil usuario
- Criterios de aceptación:
  - check-in en <= 3 clics
  - carga inicial panel < 1s
  - pruebas de usabilidad con 5 usuarios
- Script de venta:
  - demo de 5 minutos
  - foco en ahorro de tiempo + upsell de membresías

## Guía Operativa: Estructura
- Introducción y roles (responsabilidades por rol).
- Onboarding rápido (checklist de 1 día para abrir sede).
- Flujos diarios:
  - check-in
  - reservas
  - cobros
  - cierre de caja
- Resolución de incidencias (pasos y contactos).
- KPIs y reportes (lectura y acciones).
- Material visual:
  - mockups
  - iconografía
  - fotos sugeridas

## Riesgos y Trade-offs
- Riesgo: HUD sobrecargado de métricas.
  - Mitigación: role-based + máximo 3 KPIs prioritarios por pantalla.
- Trade-off: rapidez vs personalización por sede.
  - Recomendación: plantillas configurables, evitar layouts libres.

## Recomendación Comercial
- Ejecutar demo local para cadenas en Buenos Aires.
- Mensaje principal:
  - ahorro operativo medible
  - reducción de fricción diaria
  - ROI proyectado por sede

## Plan de Implementación (Fases)
1. Discovery UX por rol (jobs-to-be-done y tareas críticas).
2. Diseño HUD v1 en Figma (recepción + gerente + app usuario).
3. Construcción de componentes base y vistas críticas.
4. Integración de eventos y telemetría operativa.
5. Guía operativa por rol (HTML/PDF + checklists).
6. Validación con 5 usuarios y ajuste final.

## Estado
- Documento aprobado como base de trabajo para la siguiente iteración.
