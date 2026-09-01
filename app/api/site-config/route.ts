import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getSiteConfig } from "@/lib/site-config-loader";
import { SiteConfig } from "@/lib/site.config";

export async function GET() {
  try {
    const config = await getSiteConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error in GET /api/site-config:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // SuperAdmin verification: guillermo.diarte@gmail.com or isSuperAdmin flag
  const userEmail = session.user?.email?.toLowerCase().trim();
  const isSuperAdmin = userEmail === "guillermo.diarte@gmail.com" || (session.user as any)?.isSuperAdmin === true;

  if (!isSuperAdmin) {
    return new NextResponse("Forbidden - SuperAdmin only", { status: 403 });
  }

  try {
    const body: Partial<SiteConfig> = await req.json();

    const mapping: Record<keyof SiteConfig, string> = {
      siteName: "site_name",
      siteSlogan: "site_slogan",
      siteUrl: "site_url",
      logoUrl: "site_logo_url",
      phoneDisplay: "site_phone_display",
      phoneWhatsApp: "site_phone_whatsapp",
      email: "site_email",
      whatsappDefaultMsg: "site_whatsapp_default_msg",
      address: "site_address",
      city: "site_city",
      province: "site_province",
      country: "site_country",
      googleMapsUrl: "site_google_maps_url",
      googleMapsEmbedUrl: "site_google_maps_embed_url",
      businessHours: "site_business_hours",
      instagramUrl: "site_instagram_url",
      facebookUrl: "site_facebook_url",
      seoDescription: "site_seo_description",
      footerCopyright: "site_footer_copyright",
      footerCredit: "site_footer_credit",
      smtpHost: "smtp_host",
      smtpPort: "smtp_port",
      smtpUser: "smtp_user",
      smtpPassword: "smtp_password",
      smtpFromName: "smtp_from_name",
    };

    const updates = [];

    for (const [configKey, dbKey] of Object.entries(mapping)) {
      const value = body[configKey as keyof SiteConfig];
      if (value !== undefined) {
        updates.push(
          prisma.systemSettings.upsert({
            where: {
              sessionId_key: {
                sessionId: "", // Some setups might have unique constraint with null or string, but schema says @@unique([sessionId, key])
                key: dbKey,
              },
            },
            update: {
              value: String(value),
              updatedBy: userEmail || "superadmin",
            },
            create: {
              key: dbKey,
              value: String(value),
              sessionId: null,
              updatedBy: userEmail || "superadmin",
            },
          })
        );
      }
    }

    // Because prisma @@unique([sessionId, key]) with null sessionId in SQLite / Postgres can vary,
    // let's do a reliable upsert loop: find first with sessionId: null, then update or create.
    const customOperations = Object.entries(mapping)
      .filter(([configKey]) => body[configKey as keyof SiteConfig] !== undefined)
      .map(async ([configKey, dbKey]) => {
        const val = String(body[configKey as keyof SiteConfig] ?? "");
        const existing = await prisma.systemSettings.findFirst({
          where: { key: dbKey, sessionId: null },
        });

        if (existing) {
          return prisma.systemSettings.update({
            where: { id: existing.id },
            data: { value: val, updatedBy: userEmail || "superadmin" },
          });
        } else {
          return prisma.systemSettings.create({
            data: {
              key: dbKey,
              value: val,
              sessionId: null,
              updatedBy: userEmail || "superadmin",
            },
          });
        }
      });

    await Promise.all(customOperations);

    // Revalidate public pages so fresh values are delivered immediately
    revalidatePath("/");
    revalidatePath("/contacto");
    revalidatePath("/guia");
    revalidatePath("/departamentos");
    revalidatePath("/informacion");

    const updatedConfig = await getSiteConfig();
    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error("Error updating site config:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
