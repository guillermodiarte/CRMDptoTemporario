import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { PublicNavbar } from '@/components/public-navbar';
import { DepartmentsGallery } from '@/components/departments-gallery';
import { getSiteConfig } from '@/lib/site-config-loader';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return {
    title: `Departamentos | ${config.siteName}`,
    description: `Conocé todos los departamentos disponibles en ${config.siteName}. Fotos, comodidades, capacidad y precios.`,
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
      <PublicNavbar siteName={config.siteName} />
      <DepartmentsGallery departments={activeDepartments} config={config} />
    </>
  );
}
