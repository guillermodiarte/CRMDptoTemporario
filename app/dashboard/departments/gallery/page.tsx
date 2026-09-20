import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { DepartmentGalleryClient } from "@/components/department-gallery-client";
import { redirect } from "next/navigation";
import { syncDepartmentImages } from "@/lib/department-media";

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

  const whereClause: any = {
    type: "APARTMENT",
    isArchived: false,
    isActive: true,
    session: {
      isActive: true,
    },
  };

  if (!isSuperAdmin) {
    whereClause.sessionId = sessionId;
  }

  const departments = await prisma.department.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      images: true,
      color: true,
    },
  });

  // Automatically sync filesystem images for each department
  const syncedDepartments = await Promise.all(
    departments.map(async (dept) => {
      const syncedUrls = await syncDepartmentImages(dept);
      return {
        ...dept,
        images: JSON.stringify(syncedUrls),
      };
    })
  );

  return (
    <DepartmentGalleryClient
      initialDepartments={syncedDepartments}
      isSuperAdmin={isSuperAdmin}
      role={role}
    />
  );
}
