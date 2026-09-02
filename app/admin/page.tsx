import LoginForm from '@/components/login-form';
import { Metadata } from 'next';
import Image from 'next/image';
import { getSiteConfig } from '@/lib/site-config-loader';

export const metadata: Metadata = {
  title: 'Login',
};

export default async function LoginPage() {
  const config = await getSiteConfig();
  const bgImage = config.loginBgUrl || '/login-bg.png';
  const logoImage = config.loginLogoUrl || '/logo-diarte-vertical.png';

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${bgImage}')`,
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 z-10 bg-slate-950/50 backdrop-blur-[2px]" />

      {/* Login Card */}
      <div className="relative z-20 w-full max-w-md px-4 my-8">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl rounded-2xl p-7 sm:p-8 border border-white/40 dark:border-slate-800 transition-colors">
          <div className="mb-6 text-center">
            <div className="flex justify-center mb-3">
              <img
                src={logoImage}
                alt={config.siteName || "Logo"}
                className="max-h-20 w-auto object-contain"
              />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Bienvenido al sistema de gestión</p>
          </div>

          <LoginForm />

          <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 font-normal">
            &copy; {new Date().getFullYear()} {config.footerCopyright}
          </div>
        </div>
      </div>
    </div>
  );
}
