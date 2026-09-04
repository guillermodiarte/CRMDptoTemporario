import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { getSiteConfig } from "@/lib/site-config-loader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#ffffff",
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

  let ogImageUrl = config.ogImageUrl?.trim();
  if (ogImageUrl) {
    if (!ogImageUrl.startsWith("http")) {
      ogImageUrl = `${siteUrl.replace(/\/$/, "")}${ogImageUrl.startsWith("/") ? "" : "/"}${ogImageUrl}`;
    }
  } else {
    ogImageUrl = `${siteUrl.replace(/\/$/, "")}/icon.png?v=3`;
  }

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: config.siteName,
      template: `%s | ${config.siteName}`,
    },
    description: config.seoDescription,
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: siteUrl,
      siteName: config.siteName,
      title: config.siteName,
      description: config.seoDescription,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: config.siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: config.siteName,
      description: config.seoDescription,
      images: [ogImageUrl],
    },
    icons: {
      icon: "/icon.png?v=3",
      apple: "/icon.png?v=3",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
