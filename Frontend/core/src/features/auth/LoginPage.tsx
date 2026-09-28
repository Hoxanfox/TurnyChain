import React, { useEffect, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../app/store';
import { login, setActiveRole } from './authSlice';
import type { UserRole } from '../../types/auth';
import { settingsAPI } from '../settings/api/settingsAPI';

const roleDetails: Record<UserRole, { label: string; description: string; mark: string }> = {
  admin: { label: 'Administrador', description: 'Configuracion y control total', mark: 'A' },
  gerente: { label: 'Gerente', description: 'Equipo, inventario y metricas', mark: 'G' },
  cajero: { label: 'Cajero', description: 'Caja, pagos y ordenes', mark: 'C' },
  mesero: { label: 'Mesero', description: 'Mesas, comandas y clientes', mark: 'M' },
};

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { status, error, token, user } = useSelector((state: RootState) => state.auth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [appName, setAppName] = useState('TurnyChain');

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const settings = await settingsAPI.getSettings();
        const logo = settings.find(setting => setting.key === 'logo');
        const name = settings.find(setting => setting.key === 'app_name');
        if (name?.value) setAppName(name.value);
        if (logo?.value) {
          if (logo.value.startsWith('http')) {
            setLogoUrl(logo.value);
          } else {
            const path = logo.value.startsWith('/uploads/') ? logo.value.replace('/uploads/', '/api/static/') : logo.value;
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const base = apiUrl.startsWith('http') ? apiUrl : `${window.location.origin}${apiUrl}`;
            setLogoUrl(`${base.replace('/api', '')}${path}`);
          }
        }
      } catch (brandingError) {
        console.error('No se pudo cargar la identidad visual:', brandingError);
      }
    };
    loadBranding();
  }, []);

  useEffect(() => {
    if (token && status === 'succeeded' && user && user.roles.length > 1 && !selectedRole) {
      setSelectedRole(user.role || user.roles[0]);
    } else if (token && status === 'succeeded' && (!user || user.roles.length <= 1)) {
      navigate('/dashboard');
    }
  }, [token, status, user, selectedRole, navigate]);

  useEffect(() => {
    const message = sessionStorage.getItem('auth_error');
    if (message) {
      setAuthMessage(message);
      sessionStorage.removeItem('auth_error');
    }
    sessionStorage.removeItem('auth_redirecting');
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    dispatch(login({ username, password }));
  };

  const confirmRole = () => {
    if (!selectedRole) return;
    dispatch(setActiveRole(selectedRole));
    navigate('/dashboard');
  };

  const Brand = () => (
    <div className="flex items-center gap-3">
      {logoUrl ? <img src={logoUrl} alt={appName} className="h-12 w-12 rounded-xl bg-white object-contain p-1" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl font-black text-blue-700">{appName.charAt(0)}</div>}
      <div><h1 className="text-xl font-black">{appName}</h1></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5ff] text-slate-900 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
      <section className="relative hidden overflow-hidden bg-[#173b8f] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[48px] border-blue-200/15" />
        <div className="relative z-10"><Brand /><div className="mt-24 max-w-xl"><h2 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl">Bienvenido de nuevo.</h2><p className="mt-6 max-w-md text-lg leading-relaxed text-blue-100/80">Ingresa con tu usuario para continuar.</p></div></div>
        <p className="relative z-10 text-sm text-blue-100/60">{new Date().getFullYear()}</p>
      </section>

      <main className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Brand /></div>
          <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(23,59,143,0.12)] sm:p-9">
            <div className="mb-8"><h2 className="text-3xl font-black tracking-tight">Iniciar sesion</h2><p className="mt-2 text-sm text-slate-500">Ingresa para continuar.</p></div>
            {token && status === 'succeeded' && user && user.roles.length > 1 ? (
              <div className="space-y-5">
                <p className="text-sm text-slate-500">Esta cuenta tiene varios perfiles. Elige cómo deseas ingresar.</p>
                <div className="grid gap-3">
                  {user.roles.map(role => {
                    const detail = roleDetails[role];
                    const selected = selectedRole === role;
                    return <button key={role} type="button" onClick={() => setSelectedRole(role)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}><span className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-black ${selected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{detail.mark}</span><span className="min-w-0"><strong className="block text-sm font-black">{detail.label}</strong><small className="mt-0.5 block text-xs text-slate-500">{detail.description}</small></span><span className={`ml-auto h-4 w-4 rounded-full border-2 ${selected ? 'border-emerald-600 bg-emerald-600 ring-2 ring-white' : 'border-slate-300'}`} /></button>;
                  })}
                </div>
                <button type="button" onClick={confirmRole} disabled={!selectedRole} className="w-full rounded-xl bg-[#2454c6] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#173b8f] disabled:cursor-not-allowed disabled:opacity-40">Continuar con este perfil</button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div><label htmlFor="username" className="mb-1.5 block text-sm font-bold text-slate-700">Usuario</label><input id="username" name="username" type="text" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="Nombre de usuario" /></div>
                <div><label htmlFor="password" className="mb-1.5 block text-sm font-bold text-slate-700">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="Tu contraseña" /></div>
                <button type="submit" disabled={status === 'loading'} className="w-full rounded-xl bg-[#2454c6] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#173b8f] disabled:cursor-wait disabled:opacity-50">{status === 'loading' ? 'Ingresando...' : 'Ingresar'}</button>
                {authMessage && <p className="rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-700">{authMessage}</p>}
                {error && <p className="rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-700">{error}</p>}
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
