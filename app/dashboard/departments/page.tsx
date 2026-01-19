import prisma from "@/lib/prisma";
import { DepartmentsClient } from "@/components/departments-client";
import { auth } from "@/auth";

export default async function DepartmentsPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  const departments = await prisma.department.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Calculate Global Active Supplies Cost for display
  const supplies = await prisma.supply.findMany({ where: { isActive: true } });
  const totalSuppliesCost = supplies.reduce((acc, curr) => acc + curr.cost, 0);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DepartmentsClient data={departments} role={userRole} totalSuppliesCost={totalSuppliesCost} />
    </div>
  );
}
