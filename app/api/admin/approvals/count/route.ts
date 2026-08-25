import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { requireSessionId } from '@/lib/auth-helper';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ count: 0 });
    const sessionId = await requireSessionId();

    const count = await prisma.reservation.count({
      where: { status: 'PENDING_APPROVAL', sessionId }
    });

    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ count: 0 });
  }
}
