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
import { getUserSessions } from '@/app/login/actions';

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
      } else {
        // Single session or no session -> Direct login
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
      <>
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingrese su email para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCredentialsSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button className="w-full mt-2" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </>
    );
  }

  // Step 2: Session Selection
  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setStep('credentials')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-xl">Seleccionar Espacio</CardTitle>
        </div>
        <CardDescription>
          Elige el entorno al que deseas ingresar
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {sessions.map((session) => (
          <button
            key={session.sessionId}
            disabled={loading}
            onClick={() => handleSessionSelect(session.sessionId)}
            className="flex items-center justify-between w-full p-4 text-left border rounded-lg hover:border-primary hover:bg-muted/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-md group-hover:bg-primary/20 transition-colors">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">{session.name}</div>
                <div className="text-xs text-muted-foreground uppercase">{session.role}</div>
              </div>
            </div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </button>
        ))}

        <Button variant="ghost" className="w-full mt-2" onClick={() => setStep('credentials')} disabled={loading}>
          Cancelar
        </Button>
      </CardContent>
    </>
  );
}
