import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { PublicNavbar } from '@/components/public-navbar';
import { DepartmentsGallery } from '@/components/departments-gallery';

export default async function DepartamentosPage() {
  const activeDepartments = await prisma.department.findMany({
    where: {
      type: 'APARTMENT',
      isActive: true,
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
      <PublicNavbar />
      <DepartmentsGallery departments={activeDepartments} />
    </>
  );
}
