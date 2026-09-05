import { MetadataRoute } from 'next'
import { headers, cookies } from 'next/headers'
import { getSiteConfig } from '@/lib/site-config-loader'
import { SITE_CONFIG_DEFAULTS } from '@/lib/site.config'

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getSiteConfig();
  const iconSrc = config.appIconUrl || '/icon.png';
  const isSvg = iconSrc.toLowerCase().endsWith('.svg');
  const isWebp = iconSrc.toLowerCase().endsWith('.webp');
  const iconType = isSvg ? 'image/svg+xml' : isWebp ? 'image/webp' : 'image/png';

  let startUrl = '/';
  let appName = config.siteName || SITE_CONFIG_DEFAULTS.siteName;

  try {
    const reqHeaders = await headers();
    const referer = reqHeaders.get('referer') || '';
    const reqCookies = await cookies();
    const hasAdminSession = reqCookies.getAll().some(c => 
      c.name.includes('session-token') || c.name.includes('next-auth')
    );

    // If request originated from /dashboard or /admin, or the user is authenticated as admin on dashboard
    if (referer.includes('/dashboard') || referer.includes('/admin') || hasAdminSession) {
      startUrl = '/dashboard';
      appName = "Di'Arte — Panel Admin";
    }
  } catch {
    // Fallback if headers/cookies unavailable
  }

  return {
    name: appName,
    short_name: "Di'Arte",
    description: config.seoDescription || SITE_CONFIG_DEFAULTS.seoDescription,
    start_url: startUrl,
    display: 'standalone',
    background_color: startUrl === '/dashboard' ? '#0f172a' : '#ffffff',
    theme_color: startUrl === '/dashboard' ? '#0f172a' : '#ffffff',
    icons: [
      {
        src: iconSrc,
        sizes: 'any',
        type: iconType,
        purpose: 'any',
      },
      {
        src: '/api/app-icon?size=192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/app-icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/app-icon?maskable=1&size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
