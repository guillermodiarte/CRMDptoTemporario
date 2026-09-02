'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';
import { getUserSessions } from '@/app/admin/actions';

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'selection'>('credentials');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', credentials.email);
      formData.append('password', credentials.password);

      const result = await getUserSessions(formData);

      if (!result.success) {
        toast.error(result.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      const userSessions = result.sessions || [];

      if (userSessions.length > 1) {
        setSessions(userSessions);
        setStep('selection');
        setLoading(false);
      } else if (userSessions.length === 1) {
        // Single session -> Direct login passing the active sessionId
        await performLogin(credentials.email, credentials.password, userSessions[0].sessionId);
      } else {
        // No session -> Direct login
        await performLogin(credentials.email, credentials.password);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
      setLoading(false);
    }
  };

  const performLogin = async (email: string, password: string, sessionId?: string) => {
    try {
      const res = await signIn('credentials', {
        email,
        password,
        sessionId: sessionId || undefined,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Credenciales inválidas");
        setLoading(false);
      } else {
        toast.success("Bienvenido");
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al iniciar sesión");
      setLoading(false);
    }
  }

  const handleSessionSelect = async (sessionId: string) => {
    setLoading(true);
    await performLogin(credentials.email, credentials.password, sessionId);
  }

  // Step 1: Credentials Form
  if (step === 'credentials') {
    return (
      <div className="space-y-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Iniciar Sesión</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ingrese su email para acceder al sistema
          </p>
        </div>
        <div>
          <form onSubmit={handleCredentialsSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pr-10"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button className="w-full mt-2 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold py-2.5 rounded-xl transition-all cursor-pointer shadow-md" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ingresar'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: Session Selection
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setStep('credentials')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Seleccionar Espacio</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Elige el entorno al que deseas ingresar
        </p>
      </div>
      <div className="grid gap-3">
        {sessions.map((session) => (
          <button
            key={session.sessionId}
            disabled={loading}
            onClick={() => handleSessionSelect(session.sessionId)}
            className="flex items-center justify-between w-full p-4 text-left border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 rounded-xl hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-slate-800 transition-all group cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="bg-sky-100 dark:bg-sky-950/60 p-2.5 rounded-lg group-hover:bg-sky-200 dark:group-hover:bg-sky-900/60 transition-colors">
                <Building2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{session.name}</div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{session.role}</div>
              </div>
            </div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
            )}
          </button>
        ))}

        <Button variant="ghost" className="w-full mt-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" onClick={() => setStep('credentials')} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
