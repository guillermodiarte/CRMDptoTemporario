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
