import { NextResponse } from "next/server";
import { generateCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const challenge = generateCaptcha();
    return NextResponse.json(challenge);
  } catch (error) {
    console.error("[CAPTCHA_GET_ERROR]", error);
    return new NextResponse("Error generating captcha", { status: 500 });
  }
}
