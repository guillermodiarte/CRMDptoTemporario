import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { requireSessionId } from '@/lib/auth-helper';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const session = await auth();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });
    const sessionId = await requireSessionId();
    const { groupId } = await params;

    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const depositAmount = body.depositAmount ? Number(body.depositAmount) : 0;
    const forceApprove = body.forceApprove === true;

    // Fetch all reservations in this group to calculate total and find the first one
    const groupReservations = await prisma.reservation.findMany({
      where: { groupId },
      orderBy: { checkIn: 'asc' }
    });

    if (groupReservations.length === 0) {
      return NextResponse.json({ success: true });
    }

    const firstReservationId = groupReservations[0].id;
    const totalGroupAmount = groupReservations.reduce((acc, r) => acc + r.totalAmount, 0);

    // Filter to only those in the current session and in PENDING_APPROVAL
    const toApprove = groupReservations.filter(r => r.sessionId === sessionId && r.status === 'PENDING_APPROVAL');

    // --- Check for date conflicts ---
    if (!forceApprove) {
      const confirmedConflicts: { deptName: string; checkIn: string; checkOut: string; guestName: string }[] = [];
      const pendingConflicts: { deptName: string; checkIn: string; checkOut: string; conflictGroupId: string; guestName: string }[] = [];

      for (const res of toApprove) {
        const dept = await prisma.department.findUnique({ where: { id: res.departmentId }, select: { name: true } });

        const resInStr = res.checkIn.toISOString().split('T')[0];
        const resOutStr = res.checkOut.toISOString().split('T')[0];
        const start = new Date(`${resInStr}T12:00:00.000Z`);
        const end = new Date(`${resOutStr}T12:00:00.000Z`);

        // Check against confirmed reservations
        const confirmedCandidates = await prisma.reservation.findMany({
          where: {
            departmentId: res.departmentId,
            status: { notIn: ['CANCELLED', 'PENDING_APPROVAL'] },
            id: { not: res.id },
            checkIn: { lt: end },
            checkOut: { gt: start },
          },
          select: {
            id: true,
            guestName: true,
            checkIn: true,
            checkOut: true,
          }
        });

        for (const overlap of confirmedCandidates) {
          const overlapInStr = overlap.checkIn.toISOString().split('T')[0];
          const overlapOutStr = overlap.checkOut.toISOString().split('T')[0];
          if (overlapInStr < resOutStr && overlapOutStr > resInStr) {
            confirmedConflicts.push({
              deptName: dept?.name || res.departmentId,
              checkIn: overlap.checkIn.toISOString(),
              checkOut: overlap.checkOut.toISOString(),
              guestName: overlap.guestName || 'Reserva confirmada',
            });
          }
        }

        // Check against other PENDING_APPROVAL reservations (different group)
        const pendingCandidates = await prisma.reservation.findMany({
          where: {
            departmentId: res.departmentId,
            status: 'PENDING_APPROVAL',
            groupId: { not: groupId },
            checkIn: { lt: end },
            checkOut: { gt: start },
          },
          select: {
            id: true,
            guestName: true,
            checkIn: true,
            checkOut: true,
            groupId: true,
          }
        });

        for (const overlap of pendingCandidates) {
          const overlapInStr = overlap.checkIn.toISOString().split('T')[0];
          const overlapOutStr = overlap.checkOut.toISOString().split('T')[0];
          if (overlapInStr < resOutStr && overlapOutStr > resInStr) {
            pendingConflicts.push({
              deptName: dept?.name || res.departmentId,
              checkIn: overlap.checkIn.toISOString(),
              checkOut: overlap.checkOut.toISOString(),
              conflictGroupId: overlap.groupId || '',
              guestName: overlap.guestName || 'Solicitud pendiente',
            });
          }
        }
      }

      if (confirmedConflicts.length > 0 || pendingConflicts.length > 0) {
        return NextResponse.json({
          conflict: true,
          confirmedConflicts,
          pendingConflicts
        }, { status: 409 });
      }
    }
    // --- End conflict check ---

    for (const res of toApprove) {
      const isFirst = res.id === firstReservationId;
      const resDeposit = isFirst ? depositAmount : 0;
      const paymentStatus = resDeposit > 0 ? 'PARTIAL' : 'UNPAID';
      
      let newNotes = res.notes;
      if (isFirst && resDeposit > 0) {
        const remaining = totalGroupAmount - resDeposit;
        const depositNote = `Seña: $${resDeposit.toLocaleString()} - Restan cobrar: $${remaining.toLocaleString()}`;
        newNotes = newNotes ? `${newNotes}\n${depositNote}` : depositNote;
      }

      await prisma.reservation.update({
        where: { id: res.id },
        data: {
          status: 'CONFIRMED',
          depositAmount: resDeposit,
          paymentStatus: paymentStatus,
          notes: newNotes
        }
      });
    }

    revalidatePath('/dashboard/approvals');
    revalidatePath('/dashboard/reservations');
    revalidatePath('/dashboard/calendar');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[APPROVALS_APPROVE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
