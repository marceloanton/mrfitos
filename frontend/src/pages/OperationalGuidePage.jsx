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

export default function OperationalGuidePage() {
  return (
    <section className="space-y-6">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Guía Operativa (Web + PDF)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Manual interactivo por rol con capturas vivas del sistema y checklist de operación diaria.
            </p>
          </div>
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => window.print()}
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Rol Gerente</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            <li>Revisar KPIs de ingresos y ocupación.</li>
            <li>Priorizar vencimientos y oportunidades.</li>
            <li>Validar cierre operativo del día.</li>
          </ul>
        </article>
        <article className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Rol Recepción</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            <li>Check-in en menos de 3 clics.</li>
            <li>Cobros y actualización de estado.</li>
            <li>Escalado rápido de incidencias.</li>
          </ul>
        </article>
        <article className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Rol Operador</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            <li>Control de accesos en puerta/sala.</li>
            <li>Soporte en picos de asistencia.</li>
            <li>Comunicación de incidencias críticas.</li>
          </ul>
        </article>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Flujos con Capturas del Sistema</h3>
        <div className="grid gap-4 xl:grid-cols-2">
          {flowItems.map((item) => (
            <article key={item.route} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600">{item.description}</p>
                </div>
                <Link className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50" to={item.route}>
                  Abrir pantalla
                </Link>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <iframe
                  title={item.title}
                  src={item.route}
                  className="h-72 w-full bg-white"
                />
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
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
