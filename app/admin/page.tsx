import LoginForm from '@/components/login-form';
import { Metadata } from 'next';
import { getSiteConfig } from '@/lib/site-config-loader';
import { LoginThemeWrapper } from '@/components/login-theme-wrapper';

export const metadata: Metadata = {
  title: 'Login',
};

export default async function LoginPage() {
  const config = await getSiteConfig();
  const bgImage = config.loginBgUrl || '/uploads/general/login-bg.png';
  const logoLight = config.loginLogoUrl || '/uploads/logos/logo-diarte-vertical.png';
  const logoDark = config.loginLogoUrlDark || logoLight;
  const loginLogoSize = Number(config.loginLogoSize) || 208;

  return (
    <LoginThemeWrapper>
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
        <div
          className="relative z-20 w-full px-4 my-8 transition-all duration-200"
          style={{ maxWidth: `${Math.max(448, Math.min(loginLogoSize + 80, 560))}px` }}
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl rounded-2xl p-7 sm:p-8 border border-white/40 dark:border-slate-800 transition-colors">
            <div className="mb-6 text-center">
              <div className="flex justify-center items-center mb-4">
                {/* Light mode logo */}
                <img
                  src={logoLight}
                  alt={config.siteName || "Logo"}
                  style={{ width: `${loginLogoSize}px` }}
                  className="max-w-full h-auto object-contain drop-shadow-sm transition-all duration-200 dark:hidden"
                />
                {/* Dark mode logo */}
                <img
                  src={logoDark}
                  alt={config.siteName || "Logo"}
                  style={{ width: `${loginLogoSize}px` }}
                  className="max-w-full h-auto object-contain drop-shadow-sm transition-all duration-200 hidden dark:block"
                />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Bienvenido al sistema de gestión</p>
            </div>

            <LoginForm />

            <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} {config.footerCopyright} &middot; Versión 2.0
            </div>
          </div>
        </div>
      </div>
    </LoginThemeWrapper>
  );
}
