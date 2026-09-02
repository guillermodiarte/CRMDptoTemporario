"use client";

import { useState } from "react";

interface LoginCardLogoProps {
  logoLight: string;
  logoDark: string;
  siteName?: string;
  loginLogoSize: number;
}

export function LoginCardLogo({
  logoLight,
  logoDark,
  siteName = "Alojamientos Di'Arte",
  loginLogoSize = 208,
}: LoginCardLogoProps) {
  const [lightSrc, setLightSrc] = useState(logoLight);
  const [darkSrc, setDarkSrc] = useState(logoDark);

  return (
    <div className="flex justify-center items-center mb-4">
      {/* Light mode logo */}
      <img
        src={lightSrc}
        alt={siteName}
        style={{ width: `${loginLogoSize}px` }}
        className="max-w-full h-auto object-contain drop-shadow-sm transition-all duration-200 dark:hidden"
        onError={() => {
          if (lightSrc !== "/images/logo-diarte-vertical.png") {
            setLightSrc("/images/logo-diarte-vertical.png");
          }
        }}
      />
      {/* Dark mode logo */}
      <img
        src={darkSrc}
        alt={siteName}
        style={{ width: `${loginLogoSize}px` }}
        className="max-w-full h-auto object-contain drop-shadow-sm transition-all duration-200 hidden dark:block"
        onError={() => {
          if (darkSrc !== "/images/logo-diarte-vertical.png") {
            setDarkSrc("/images/logo-diarte-vertical.png");
          }
        }}
      />
    </div>
  );
}
