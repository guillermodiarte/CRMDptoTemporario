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

    // --- Conflict Detection ---
    const departmentIds = [...new Set(allRelated.map(r => r.departmentId))];
    const blockingReservations = await prisma.reservation.findMany({
      where: {
        departmentId: { in: departmentIds },
        status: { notIn: ['CANCELLED', 'PENDING_APPROVAL'] }
      },
      select: { id: true, departmentId: true, checkIn: true, checkOut: true }
    });

    const conflicts: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    for (const r of allRelated) {
      adj[r.id] = [];
    }

    for (let i = 0; i < allRelated.length; i++) {
      const r1 = allRelated[i];
      if (r1.status !== 'PENDING_APPROVAL' || r1.sessionId !== sessionId) continue;

      const r1In = r1.checkIn.toISOString().split('T')[0];
      const r1Out = r1.checkOut.toISOString().split('T')[0];

      // check blocking
      for (const b of blockingReservations) {
        const bIn = b.checkIn.toISOString().split('T')[0];
        const bOut = b.checkOut.toISOString().split('T')[0];
        if (r1.departmentId === b.departmentId && r1In < bOut && r1Out > bIn) {
           adj[r1.id].push(r1.id); // self-edge means it's in a conflict
           break;
        }
      }

      // check other pending
      for (let j = i + 1; j < allRelated.length; j++) {
        const r2 = allRelated[j];
        if (r2.status !== 'PENDING_APPROVAL' || r2.sessionId !== sessionId) continue;
        
        const r2In = r2.checkIn.toISOString().split('T')[0];
        const r2Out = r2.checkOut.toISOString().split('T')[0];
        if (r1.departmentId === r2.departmentId && r1In < r2Out && r1Out > r2In) {
          adj[r1.id].push(r2.id);
          adj[r2.id].push(r1.id);
        }
      }
    }

    let conflictCounter = 1;
    const visited = new Set<string>();
    
    for (const r of allRelated) {
      if (!visited.has(r.id) && adj[r.id].length > 0) {
        const stack = [r.id];
        while (stack.length > 0) {
          const node = stack.pop()!;
          if (!visited.has(node)) {
            visited.add(node);
            conflicts[node] = conflictCounter;
            for (const neighbor of adj[node]) {
              if (!visited.has(neighbor)) stack.push(neighbor);
            }
          }
        }
        conflictCounter++;
      }
    }
    // --- End Conflict Detection ---

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
          conflictId: conflicts[r.id] || null
        })),
    }));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <ClipboardCheck className="w-8 h-8 text-sky-600 dark:text-sky-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Aprobaciones Pendientes</h1>
      </div>

      <ApprovalsClient initialApprovals={approvals} currentSessionId={sessionId} />
    </div>
  );
}
