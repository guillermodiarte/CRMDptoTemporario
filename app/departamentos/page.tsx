import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { PublicNavbar } from '@/components/public-navbar';
import { DepartmentsGallery } from '@/components/departments-gallery';
import { getSiteConfig } from '@/lib/site-config-loader';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const config = await getSiteConfig();
  const title = `Departamentos Amoblados en Formosa | Alquileres Temporarios Di'Arte`;
  const description = `Alquiler de departamentos amoblados y temporarios en Formosa Capital. Unidades totalmente equipadas con cocina, aire acondicionado, WiFi y ropa blanca para turistas, profesionales y familias.`;
  return {
    title,
    description,
    keywords: [
      "departamentos amoblados formosa",
      "alquileres temporarios formosa",
      "departamentos en formosa",
      "alojamientos temporarios formosa",
      "alquiler por dia formosa",
    ],
    openGraph: {
      title,
      description,
      url: `${config.siteUrl || "https://alojamientosdiarte.com"}/departamentos`,
    },
    alternates: {
      canonical: `${config.siteUrl || "https://alojamientosdiarte.com"}/departamentos`,
    },
  };
}

export default async function DepartamentosPage() {
  const config = await getSiteConfig();

  const activeDepartments = await prisma.department.findMany({
    where: {
      type: 'APARTMENT',
      isActive: true,
      showOnPublic: true,
      isArchived: false,
      OR: [
        { sessionId: null },
        { session: { isActive: true } }
      ]
    },
    orderBy: [
      { order: "asc" },
      { createdAt: "desc" }
    ],
    select: {
      id: true,
      name: true,
      description: true,
      basePrice: true,
      bedCount: true,
      maxPeople: true,
      images: true,
      color: true,
      prices: true,
      amenities: true,
      address: true,
      googleMapsLink: true,
      reservations: {
        where: {
          status: { in: ['CONFIRMED', 'TENTATIVE'] },
          checkOut: { gte: new Date() },
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
        }
      }
    }
  });

  return (
    <>
      <PublicNavbar siteName={config.siteName} logoUrl={config.logoUrl} logoUrlDark={config.logoUrlDark} logoSize={config.logoSize} guiaEnabled={config.guiaEnabled} />
      <DepartmentsGallery departments={activeDepartments} config={config} />
    </>
  );
}
