import prisma from "@/lib/prisma";
import { DepartmentsClient } from "@/components/departments-client";
import { auth } from "@/auth";

export default async function DepartmentsPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const sessionId = session?.user?.sessionId;

  const departments = await prisma.department.findMany({
    where: {
      type: 'APARTMENT',
      sessionId
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate Global Active Supplies Cost for display
  const totalSuppliesCost = 0; // Calcular si es necesario

  return (
    <div className="flex-1 space-y-4">
      <DepartmentsClient
        initialDepartments={departments}
        role={userRole}
        totalSuppliesCost={totalSuppliesCost}
        defaultType="APARTMENT"
        title="Departamentos"
      />
    </div>
  );
}
