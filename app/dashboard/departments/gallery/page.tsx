import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { DepartmentGalleryClient } from "@/components/department-gallery-client";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Galería de Imágenes | Departamentos",
};

export const dynamic = 'force-dynamic';

export default async function DepartmentGalleryPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin");

  const sessionId = (session.user as any)?.sessionId;
  const isSuperAdmin = (session.user as any)?.isSuperAdmin === true;
  const role = (session.user as any)?.role || "ADMIN";

  const departments = await prisma.department.findMany({
    where: {
      type: "APARTMENT",
      sessionId: isSuperAdmin ? undefined : sessionId,
      isArchived: false,
      isActive: true,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      images: true,
      color: true,
    },
  });

  return (
    <DepartmentGalleryClient
      initialDepartments={departments}
      isSuperAdmin={isSuperAdmin}
      role={role}
    />
  );
}
