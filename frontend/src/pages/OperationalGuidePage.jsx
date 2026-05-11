import { Link } from 'react-router-dom';

const flowItems = [
  {
    title: 'Dashboard Operativo',
    route: '/dashboard',
    description: 'Lectura de KPIs y acciones rápidas por rol.'
  },
  {
    title: 'Check-in y Asistencia',
    route: '/attendance',
    description: 'Ingreso/salida de socios y control de flujo diario.'
  },
  {
    title: 'Cobros y Caja',
    route: '/payments',
    description: 'Registro de pagos, estado y validación operativa.'
  },
  {
    title: 'Control Comercial',
    route: '/admin/billing',
    description: 'Prioridades del día, guiones y seguimiento de conversión.'
  }
];

const roleCards = [
  {
    title: 'Rol Gerente',
    badge: 'Decisión',
    tone: 'border-indigo-200 bg-indigo-50',
    items: [
      'Revisar KPIs de ingresos y ocupación.',
      'Priorizar vencimientos y oportunidades.',
      'Validar cierre operativo del día.'
    ]
  },
  {
    title: 'Rol Recepción',
    badge: 'Ejecución',
    tone: 'border-emerald-200 bg-emerald-50',
    items: [
      'Check-in en menos de 3 clics.',
      'Cobros y actualización de estado.',
      'Escalado rápido de incidencias.'
    ]
  },
  {
    title: 'Rol Operador',
    badge: 'Control',
    tone: 'border-amber-200 bg-amber-50',
    items: [
      'Control de accesos en puerta/sala.',
      'Soporte en picos de asistencia.',
      'Comunicación de incidencias críticas.'
    ]
  }
];

export default function OperationalGuidePage() {
  return (
    <section className="space-y-6 print:space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 text-slate-100 print:bg-slate-100 print:text-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300 print:text-slate-600">MRAnalytics · Manual Operativo</p>
          <h2 className="mt-1 text-2xl font-semibold">Guía Operativa (Web + PDF)</h2>
          <p className="mt-1 text-sm text-slate-300 print:text-slate-600">
            Manual interactivo por rol con capturas del sistema y checklist de operación diaria.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex flex-wrap gap-2 text-xs print:hidden">
            <a href="#roles" className="rounded-full border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50">Roles</a>
            <a href="#flujos" className="rounded-full border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50">Flujos</a>
            <a href="#checklist" className="rounded-full border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50">Checklist</a>
          </div>
          <div>
            <p className="text-xs text-slate-500 print:text-slate-700">Versión operativa lista para capacitación interna.</p>
          </div>
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 print:hidden"
            onClick={() => window.print()}
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div id="roles" className="grid gap-4 lg:grid-cols-3 print:grid-cols-1">
        {roleCards.map((role) => (
          <article key={role.title} className={`rounded-xl border p-4 shadow-sm print:shadow-none print:border-slate-300 ${role.tone}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{role.title}</h3>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{role.badge}</span>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {role.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div id="flujos" className="space-y-4 print:space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">Flujos con Capturas del Sistema</h3>
        <div className="grid gap-4 xl:grid-cols-2 print:grid-cols-1">
          {flowItems.map((item) => (
            <article key={item.route} className="rounded-xl bg-white p-4 shadow-sm print:break-inside-avoid print:shadow-none print:border print:border-slate-300">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600">{item.description}</p>
                </div>
                <Link className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 print:hidden" to={item.route}>
                  Abrir pantalla
                </Link>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 print:hidden">
                <iframe
                  title={item.title}
                  src={item.route}
                  className="h-72 w-full bg-white"
                />
              </div>
              <div className="hidden rounded-lg border border-dashed border-slate-300 p-3 print:block">
                <p className="text-xs text-slate-700">Captura recomendada: {item.title}</p>
                <p className="mt-1 text-xs text-slate-500">Ruta: {item.route}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div id="checklist" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:shadow-none print:border-slate-300">
        <h3 className="text-lg font-semibold text-slate-900">Checklist Diario</h3>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Apertura: validar usuarios, sede y agenda.</li>
          <li>Operación: check-ins, reservas, cobros y alertas.</li>
          <li>Comercial: ejecutar top prioridades y guiones.</li>
          <li>Cierre: revisión de caja, incidencias y reporte.</li>
        </ol>
      </div>
    </section>
  );
}
