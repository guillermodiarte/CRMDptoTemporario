import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncAllDepartmentsImages } from "@/lib/department-media";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const syncedDepartments = await syncAllDepartmentsImages();

    return NextResponse.json({
      success: true,
      departments: syncedDepartments,
    });
  } catch (error: any) {
    console.error("Error syncing department images:", error);
    return NextResponse.json(
      { error: error?.message || "Error al sincronizar imágenes" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
