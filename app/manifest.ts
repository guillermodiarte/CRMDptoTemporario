import { MetadataRoute } from 'next'
import { getSiteConfig } from '@/lib/site-config-loader'
import { SITE_CONFIG_DEFAULTS } from '@/lib/site.config'

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getSiteConfig();
  const iconSrc = config.appIconUrl || '/icon.png';
  const isSvg = iconSrc.toLowerCase().endsWith('.svg');
  const isWebp = iconSrc.toLowerCase().endsWith('.webp');
  const iconType = isSvg ? 'image/svg+xml' : isWebp ? 'image/webp' : 'image/png';

  return {
    name: config.siteName || SITE_CONFIG_DEFAULTS.siteName,
    short_name: "Di'Arte",
    description: config.seoDescription || SITE_CONFIG_DEFAULTS.seoDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
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
