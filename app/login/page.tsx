import LoginForm from '@/components/login-form';
import { Metadata } from 'next';
import { Logo } from '@/components/logo';

export const metadata: Metadata = {
  title: 'Login',
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/login-bg.png')",
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px]" />

      {/* Login Card */}
      <div className="relative z-20 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-xl p-8 border border-white/20">
          <div className="mb-8 text-center">
            <div className="flex flex-col items-center gap-2 mb-2">
              <Logo className="h-12 w-12 text-primary" />
              <h1 className="text-3xl font-bold text-gray-900">Alojamientos Di'Arte</h1>
            </div>
            <p className="text-gray-500 text-sm">Bienvenido al sistema de gestión</p>
          </div>

          <LoginForm />

          <div className="mt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Gestión de Propiedades by Guillermo A. Diarte
          </div>
        </div>
      </div>
    </div>
  );
}
