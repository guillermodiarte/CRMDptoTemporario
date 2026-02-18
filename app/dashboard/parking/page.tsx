
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { DepartmentsClient } from "@/components/departments-client";

export default async function ParkingPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const sessionId = session?.user?.sessionId;

  const departments = await prisma.department.findMany({
    where: {
      // @ts-ignore
      type: 'PARKING',
      sessionId
    },
    orderBy: { createdAt: "desc" },
  });

  const totalSuppliesCost = 0;

  return (
    <div className="flex-1 space-y-4">
      <DepartmentsClient
        initialDepartments={departments}
        role={userRole}
        totalSuppliesCost={totalSuppliesCost}
        defaultType="PARKING"
        title="Cocheras"
      />
    </div>
  );
}
