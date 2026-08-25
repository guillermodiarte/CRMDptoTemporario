import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { DepartmentGalleryClient } from "@/components/department-gallery-client";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Galería de Imágenes | Departamentos",
};

export default async function DepartmentGalleryPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const sessionId = (session.user as any)?.sessionId;

  const departments = await prisma.department.findMany({
    where: {
      type: "APARTMENT",
      sessionId,
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

  return <DepartmentGalleryClient initialDepartments={departments} />;
}
