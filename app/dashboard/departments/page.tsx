import prisma from "@/lib/prisma";
import { DepartmentsClient } from "@/components/departments-client";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function DepartmentsPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const sessionId = session?.user?.sessionId;
  const isSuperAdmin = session?.user?.email === "guillermo.diarte@gmail.com";

  const departments = await prisma.department.findMany({
    where: {
      type: 'APARTMENT',
      sessionId
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate Global Active Supplies Cost for display
  const totalSuppliesCost = 0; // Calcular si es necesario

  let otherSessionsDepts: { sessionName: string; departments: any[] }[] = [];

  if (isSuperAdmin && sessionId) {
    const allOtherSessions = await prisma.session.findMany({
      where: {
        id: { not: sessionId },
        isActive: true
      },
      include: {
        departments: {
          where: { type: 'APARTMENT' },
          orderBy: { createdAt: "desc" }
        }
      }
    });
    otherSessionsDepts = allOtherSessions
      .filter(s => s.departments.length > 0)
      .map(s => ({
        sessionName: s.name,
        departments: s.departments
      }));
  }

  return (
    <div className="flex-1 space-y-4">
      <DepartmentsClient
        initialDepartments={departments}
        role={userRole}
        totalSuppliesCost={totalSuppliesCost}
        defaultType="APARTMENT"
        title="Departamentos"
        otherSessionsDepts={otherSessionsDepts}
      />
    </div>
  );
}
