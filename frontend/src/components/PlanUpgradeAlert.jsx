import { Link } from 'react-router-dom';

export default function PlanUpgradeAlert({ info }) {
  if (!info) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <p className="font-semibold">{info.title}</p>
      <p className="mt-1 text-sm">{info.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link className="rounded bg-amber-600 px-3 py-2 text-sm text-white" to="/pricing">
          Ver planes
        </Link>
        <Link className="rounded border border-amber-400 px-3 py-2 text-sm" to="/admin/subscription">
          Gestionar suscripción
        </Link>
      </div>
    </div>
  );
}
