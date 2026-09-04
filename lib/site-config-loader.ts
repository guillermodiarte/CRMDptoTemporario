import prisma from "@/lib/prisma";
import { SITE_CONFIG_DEFAULTS, SiteConfig } from "@/lib/site.config";

const SITE_CONFIG_KEYS = [
  "site_name",
  "site_slogan",
  "site_url",
  "site_logo_url",
  "site_logo_url_dark",
  "site_logo_size",
  "site_admin_logo_url",
  "site_admin_logo_url_dark",
  "site_admin_logo_size",
  "site_login_bg_url",
  "site_login_logo_url",
  "site_login_logo_url_dark",
  "site_login_logo_size",
  "site_hero_slides",
  "site_hero_slide_interval",
  "site_hero_overlay_opacity",
  "site_phone_display",
  "site_phone_whatsapp",
  "site_email",
  "site_whatsapp_default_msg",
  "site_address",
  "site_city",
  "site_province",
  "site_country",
  "site_google_maps_url",
  "site_google_maps_embed_url",
  "site_business_hours",
  "site_instagram_url",
  "site_facebook_url",
  "site_seo_description",
  "site_footer_copyright",
  "site_footer_credit",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_password",
  "smtp_from_name",
  "site_guia_enabled",
] as const;

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: { in: [...SITE_CONFIG_KEYS] },
        sessionId: null,
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    return {
      siteName: map.get("site_name") ?? SITE_CONFIG_DEFAULTS.siteName,
      siteSlogan: map.get("site_slogan") ?? SITE_CONFIG_DEFAULTS.siteSlogan,
      siteUrl: map.get("site_url") ?? SITE_CONFIG_DEFAULTS.siteUrl,
      logoUrl: map.get("site_logo_url") ?? SITE_CONFIG_DEFAULTS.logoUrl,
      logoUrlDark: map.get("site_logo_url_dark") ?? SITE_CONFIG_DEFAULTS.logoUrlDark,
      logoSize: map.get("site_logo_size") ?? SITE_CONFIG_DEFAULTS.logoSize,
      adminLogoUrl: map.get("site_admin_logo_url") ?? SITE_CONFIG_DEFAULTS.adminLogoUrl,
      adminLogoUrlDark: map.get("site_admin_logo_url_dark") ?? SITE_CONFIG_DEFAULTS.adminLogoUrlDark,
      adminLogoSize: map.get("site_admin_logo_size") ?? SITE_CONFIG_DEFAULTS.adminLogoSize,
      loginBgUrl: map.get("site_login_bg_url") ?? SITE_CONFIG_DEFAULTS.loginBgUrl,
      loginLogoUrl: map.get("site_login_logo_url") ?? SITE_CONFIG_DEFAULTS.loginLogoUrl,
      loginLogoUrlDark: map.get("site_login_logo_url_dark") ?? SITE_CONFIG_DEFAULTS.loginLogoUrlDark,
      loginLogoSize: map.get("site_login_logo_size") ?? SITE_CONFIG_DEFAULTS.loginLogoSize,
      heroSlides: map.get("site_hero_slides") ?? SITE_CONFIG_DEFAULTS.heroSlides,
      heroSlideInterval: map.get("site_hero_slide_interval") ?? SITE_CONFIG_DEFAULTS.heroSlideInterval,
      heroOverlayOpacity: map.get("site_hero_overlay_opacity") ?? SITE_CONFIG_DEFAULTS.heroOverlayOpacity,
      phoneDisplay: map.get("site_phone_display") ?? SITE_CONFIG_DEFAULTS.phoneDisplay,
      phoneWhatsApp: map.get("site_phone_whatsapp") ?? SITE_CONFIG_DEFAULTS.phoneWhatsApp,
      email: map.get("site_email") ?? SITE_CONFIG_DEFAULTS.email,
      whatsappDefaultMsg: map.get("site_whatsapp_default_msg") ?? SITE_CONFIG_DEFAULTS.whatsappDefaultMsg,
      address: map.get("site_address") ?? SITE_CONFIG_DEFAULTS.address,
      city: map.get("site_city") ?? SITE_CONFIG_DEFAULTS.city,
      province: map.get("site_province") ?? SITE_CONFIG_DEFAULTS.province,
      country: map.get("site_country") ?? SITE_CONFIG_DEFAULTS.country,
      googleMapsUrl: map.get("site_google_maps_url") ?? SITE_CONFIG_DEFAULTS.googleMapsUrl,
      googleMapsEmbedUrl: map.get("site_google_maps_embed_url") ?? SITE_CONFIG_DEFAULTS.googleMapsEmbedUrl,
      businessHours: map.get("site_business_hours") ?? SITE_CONFIG_DEFAULTS.businessHours,
      instagramUrl: map.get("site_instagram_url") ?? SITE_CONFIG_DEFAULTS.instagramUrl,
      facebookUrl: map.get("site_facebook_url") ?? SITE_CONFIG_DEFAULTS.facebookUrl,
      seoDescription: map.get("site_seo_description") ?? SITE_CONFIG_DEFAULTS.seoDescription,
      footerCopyright: map.get("site_footer_copyright") ?? SITE_CONFIG_DEFAULTS.footerCopyright,
      footerCredit: map.get("site_footer_credit") ?? SITE_CONFIG_DEFAULTS.footerCredit,
      smtpHost: map.get("smtp_host") ?? SITE_CONFIG_DEFAULTS.smtpHost,
      smtpPort: map.get("smtp_port") ?? SITE_CONFIG_DEFAULTS.smtpPort,
      smtpUser: map.get("smtp_user") ?? SITE_CONFIG_DEFAULTS.smtpUser,
      smtpPassword: map.get("smtp_password") ?? SITE_CONFIG_DEFAULTS.smtpPassword,
      smtpFromName: map.get("smtp_from_name") ?? SITE_CONFIG_DEFAULTS.smtpFromName,
      guiaEnabled: map.get("site_guia_enabled") ?? SITE_CONFIG_DEFAULTS.guiaEnabled,
    };
  } catch (error) {
    console.error("Error loading site config, falling back to defaults:", error);
    return SITE_CONFIG_DEFAULTS;
  }
}
