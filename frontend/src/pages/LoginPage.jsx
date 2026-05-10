import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const [form, setForm] = useState({ email: '', password: '', gym_id: '' });

  const onSubmit = async (event) => {
    event.preventDefault();
    const ok = await login(form.email, form.password, form.gym_id || null);
    if (ok) navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow">
        <h2 className="text-2xl font-semibold">Ingreso</h2>
        <input
          className="w-full rounded-lg border border-slate-300 p-3"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          required
        />
        <input
          className="w-full rounded-lg border border-slate-300 p-3"
          type="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          required
        />
        <input
          className="w-full rounded-lg border border-slate-300 p-3"
          type="number"
          placeholder="Gym ID (opcional)"
          value={form.gym_id}
          onChange={(e) => setForm((s) => ({ ...s, gym_id: e.target.value }))}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className="w-full rounded-lg bg-brand-600 p-3 font-medium text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <div className="text-center text-sm">
          <Link className="text-brand-700 hover:underline" to="/pricing">
            Ver planes y precios
          </Link>
        </div>
      </form>
    </div>
  );
}
