import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ApprovalsClient } from '@/components/approvals-client';
import { ClipboardCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session) redirect('/');

  const sessionId = session.user?.sessionId;
  if (!sessionId) redirect('/select-session');

  // Find all PENDING_APPROVAL groupIds in this session
  const pendingInSession = await prisma.reservation.findMany({
    where: { status: 'PENDING_APPROVAL', sessionId },
    select: { groupId: true }
  });

  const groupIds = [...new Set(pendingInSession.map(r => r.groupId).filter(Boolean))] as string[];

  let approvals: any[] = [];

  if (groupIds.length > 0) {
    const allRelated = await prisma.reservation.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        department: { select: { id: true, name: true, images: true, sessionId: true } }
      },
      orderBy: { checkIn: 'asc' }
    });

    // Group by groupId
    const grouped: Record<string, typeof allRelated> = {};
    for (const res of allRelated) {
      if (!res.groupId) continue;
      if (!grouped[res.groupId]) grouped[res.groupId] = [];
      grouped[res.groupId].push(res);
    }

    approvals = Object.entries(grouped).map(([groupId, reservations]) => ({
      groupId,
      reservations: reservations.map(r => ({
        ...r,
        checkIn: r.checkIn.toISOString(),
        checkOut: r.checkOut.toISOString(),
      })),
      pendingForSession: reservations
        .filter(r => r.sessionId === sessionId && r.status === 'PENDING_APPROVAL')
        .map(r => ({
          ...r,
          checkIn: r.checkIn.toISOString(),
          checkOut: r.checkOut.toISOString(),
        })),
    }));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-amber-100 rounded-2xl">
          <ClipboardCheck className="w-7 h-7 text-amber-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Aprobación de Reservas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {approvals.length === 0
              ? 'No hay solicitudes pendientes'
              : `${approvals.length} solicitud(es) esperando tu aprobación`}
          </p>
        </div>
      </div>

      <ApprovalsClient initialApprovals={approvals} currentSessionId={sessionId} />
    </div>
  );
}
