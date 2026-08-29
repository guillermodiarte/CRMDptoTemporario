import { MetadataRoute } from 'next'
import { SITE_CONFIG_DEFAULTS } from '@/lib/site.config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_CONFIG_DEFAULTS.siteName,
    short_name: SITE_CONFIG_DEFAULTS.siteName.split(" ")[0] || "Alojamientos",
    description: SITE_CONFIG_DEFAULTS.seoDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
