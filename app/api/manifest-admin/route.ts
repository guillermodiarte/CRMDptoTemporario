import { NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/site-config-loader';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await getSiteConfig();
  const iconSrc = config.appIconUrl || '/icon.png';
  const isSvg = iconSrc.toLowerCase().endsWith('.svg');
  const isWebp = iconSrc.toLowerCase().endsWith('.webp');
  const iconType = isSvg ? 'image/svg+xml' : isWebp ? 'image/webp' : 'image/png';

  const manifest = {
    name: "Di'Arte — Panel Admin",
    short_name: "Di'Arte",
    description: "Panel de administración de reservas Di'Arte",
    start_url: '/dashboard',
    scope: '/dashboard',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      {
        src: iconSrc,
        sizes: 'any',
        type: iconType,
        purpose: 'any',
      },
      {
        src: iconSrc,
        sizes: '192x192',
        type: iconType,
        purpose: 'any',
      },
      {
        src: iconSrc,
        sizes: '512x512',
        type: iconType,
        purpose: 'any',
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
