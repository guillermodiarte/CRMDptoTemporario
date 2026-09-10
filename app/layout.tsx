import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { getSiteConfig } from "@/lib/site-config-loader";
import { SeoStructuredData } from "@/components/seo-structured-data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();

  let siteUrl = "https://alojamientosdiarte.com";
  try {
    const raw = config.siteUrl?.trim() || siteUrl;
    const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
    new URL(withProtocol);
    siteUrl = withProtocol;
  } catch {
    siteUrl = "https://alojamientosdiarte.com";
  }
  siteUrl = siteUrl.replace(/\/$/, "");

  let ogImageUrl = config.ogImageUrl?.trim();
  if (ogImageUrl) {
    if (!ogImageUrl.startsWith("http")) {
      ogImageUrl = `${siteUrl}${ogImageUrl.startsWith("/") ? "" : "/"}${ogImageUrl}`;
    }
  } else {
    ogImageUrl = `${siteUrl}/icon.png?v=3`;
  }

  const keywordsArray = config.seoKeywords
    ? config.seoKeywords.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${config.siteName} | Departamentos y Alquileres Temporarios en Formosa`,
      template: `%s | ${config.siteName}`,
    },
    description: config.seoDescription,
    keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
    alternates: {
      canonical: siteUrl,
    },
    verification: config.googleVerification?.trim()
      ? {
          google: config.googleVerification.trim(),
        }
      : undefined,
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: siteUrl,
      siteName: config.siteName,
      title: `${config.siteName} | Departamentos y Alquileres Temporarios en Formosa`,
      description: config.seoDescription,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${config.siteName} - Alquileres Temporarios en Formosa`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${config.siteName} | Departamentos y Alquileres Temporarios en Formosa`,
      description: config.seoDescription,
      images: [ogImageUrl],
    },
    icons: {
      icon: config.appIconUrl || "/icon.png?v=3",
      apple: config.appIconUrl || "/icon.png?v=3",
    },
    appleWebApp: {
      capable: true,
      title: "Di'Arte",
      statusBarStyle: "default",
    },
    other: {
      "geo.region": "AR-P",
      "geo.placename": "Formosa",
      "geo.position": "-26.1852;-58.1754",
      ICBM: "-26.1852, -58.1754",
      "format-detection": "telephone=yes",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <SeoStructuredData config={config} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var path = window.location.pathname;
                  var isAdmin = path.startsWith('/dashboard') || path.startsWith('/admin');
                  var key = isAdmin ? 'crm-admin-theme-preference' : 'crm-theme-preference';
                  var saved = localStorage.getItem(key);
                  if (saved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (saved === 'light') {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
