import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../services/trackingService';

export default function PlanUpgradeModal({ info, isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen || !info) return null;

  const handlePayNow = () => {
    trackEvent('upgrade_pay_now_click', 'plan_limit_modal', {
      source: 'plan_upgrade_modal'
    });
    navigate('/billing/self-service');
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-xl font-semibold text-slate-900">{info.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{info.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
          <button
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={handlePayNow}
            type="button"
          >
            Pagar ahora
          </button>
        </div>
      </div>
    </div>
  );
}
