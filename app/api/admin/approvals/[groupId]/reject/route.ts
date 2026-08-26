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

    // Delete (not cancel) the pending reservations so they don't pollute the reservations list
    await prisma.reservation.deleteMany({
      where: { groupId, sessionId, status: 'PENDING_APPROVAL' }
    });

    revalidatePath('/dashboard/approvals');
    revalidatePath('/dashboard/reservations');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[APPROVALS_REJECT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
