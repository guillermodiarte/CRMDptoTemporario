import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, guestName, guestDni, guestNationality, guestPhone, people, hasParking, segments } = body;

    if (!guestName || !guestPhone || !segments || segments.length === 0) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const groupId = crypto.randomUUID();
    const createdReservations = [];

    for (const seg of segments) {
      const dept = await prisma.department.findUnique({
        where: { id: seg.deptId },
        select: { id: true, sessionId: true }
      });

      if (!dept) {
        return NextResponse.json({ error: `Departamento ${seg.deptId} no encontrado` }, { status: 404 });
      }

      // Fetch global cleaning fee for this session
      let cleaningFee = 0;
      if (dept.sessionId) {
        const settings = await prisma.systemSettings.findUnique({
          where: { sessionId_key: { sessionId: dept.sessionId, key: "DEFAULT_CLEANING_FEE" } }
        });
        cleaningFee = settings ? parseFloat(settings.value) : 0;
      }

      const reservation = await prisma.reservation.create({
        data: {
          departmentId: dept.id,
          sessionId: dept.sessionId,
          source: 'DIRECT',
          status: 'PENDING_APPROVAL',
          guestName,
          guestDni: guestDni || null,
          guestNationality: guestNationality || null,
          guestPhone,
          guestPeopleCount: people,
          bedsRequired: people,
          checkIn: new Date(seg.checkIn),
          checkOut: new Date(seg.checkOut),
          totalAmount: seg.totalAmount,
          depositAmount: 0,
          cleaningFee: cleaningFee,
          hasParking: hasParking || false,
          groupId,
          notes: type === 'combination' ? `Reserva combinada (${segments.length} departamentos)` : null,
        }
      });

      createdReservations.push(reservation);
    }

    return NextResponse.json({ success: true, groupId, reservations: createdReservations }, { status: 201 });
  } catch (error) {
    console.error('Error creating public reservation request:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
