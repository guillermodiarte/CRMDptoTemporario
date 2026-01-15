import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { UsersClient } from "@/components/users-client";

export default async function UsersPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
  });

  return <UsersClient data={users} currentUserId={session?.user?.id} />;
}
