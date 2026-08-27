import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { PublicLandingClient } from '@/components/public-landing-client'
import { PublicNavbar } from '@/components/public-navbar'

export const dynamic = 'force-dynamic';

export default async function Home({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const session = await auth()
  const resolvedParams = await searchParams

  const today = new Date()
  const next30Days = new Date(today)
  next30Days.setDate(today.getDate() + 30)

  // Fetch active departments with type APARTMENT
  const departments = await prisma.department.findMany({
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
          checkOut: { gte: today },
          checkIn: { lte: next30Days },
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
        }
      }
    }
  })

  return (
    <>
      <PublicNavbar />
      <PublicLandingClient initialDepartments={departments} />
    </>
  )
}
