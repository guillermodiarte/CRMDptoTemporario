"use client";

interface LoginCardLogoProps {
  logoLight?: string | null;
  logoDark?: string | null;
  siteName?: string;
  loginLogoSize?: number;
}

export function LoginCardLogo({
  logoLight,
  logoDark,
  siteName = "Alojamientos Di'Arte",
  loginLogoSize = 208,
}: LoginCardLogoProps) {
  const effectiveDark = logoDark || logoLight;

  if (!logoLight) {
    return (
      <div className="flex justify-center items-center mb-4">
        <span className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
          {siteName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center mb-4">
      {/* Light mode logo */}
      <img
        src={logoLight}
        alt={siteName}
        style={{ width: `${loginLogoSize}px` }}
        className="max-w-full h-auto object-contain drop-shadow-sm transition-all duration-200 dark:hidden"
      />
      {/* Dark mode logo */}
      <img
        src={effectiveDark!}
        alt={siteName}
        style={{ width: `${loginLogoSize}px` }}
        className="max-w-full h-auto object-contain drop-shadow-sm transition-all duration-200 hidden dark:block"
      />
    </div>
  );
}
