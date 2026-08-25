import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { requireSessionId } from '@/lib/auth-helper';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });
    const sessionId = await requireSessionId();

    // Find all groupIds of PENDING_APPROVAL reservations in this session
    const pendingInSession = await prisma.reservation.findMany({
      where: { status: 'PENDING_APPROVAL', sessionId },
      select: { groupId: true }
    });

    const groupIds = [...new Set(pendingInSession.map(r => r.groupId).filter(Boolean))] as string[];

    if (groupIds.length === 0) return NextResponse.json([]);

    // For each groupId, fetch ALL reservations (across sessions) for full context
    const allRelatedReservations = await prisma.reservation.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        department: { select: { id: true, name: true, images: true, sessionId: true } }
      },
      orderBy: { checkIn: 'asc' }
    });

    // Group by groupId
    const grouped: Record<string, typeof allRelatedReservations> = {};
    for (const res of allRelatedReservations) {
      if (!res.groupId) continue;
      if (!grouped[res.groupId]) grouped[res.groupId] = [];
      grouped[res.groupId].push(res);
    }

    const result = Object.entries(grouped).map(([groupId, reservations]) => ({
      groupId,
      reservations,
      // The ones this admin needs to act on
      pendingForSession: reservations.filter(r => r.sessionId === sessionId && r.status === 'PENDING_APPROVAL'),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[APPROVALS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
