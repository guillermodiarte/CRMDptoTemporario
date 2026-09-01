import { NextRequest, NextResponse } from "next/server";
import { verifyCaptcha } from "@/lib/captcha";
import { sendContactEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// In-memory rate limiter per IP: max 5 messages per 10 minutes
const ipRequests = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);

  if (!entry || entry.expiresAt < now) {
    ipRequests.set(ip, { count: 1, expiresAt: now + 10 * 60 * 1000 });
    return true;
  }

  if (entry.count >= 5) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Has superado el límite de envíos. Por favor espera unos minutos." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, phone, message, captchaAnswer, captchaToken, honeypot, clientTimestamp } = body;

    // 1. Honeypot check: Bots fill hidden fields
    if (honeypot) {
      console.warn(`[CONTACT_BOT_TRAP] Honeypot filled by IP ${ip}:`, honeypot);
      // Return success to confuse the bot without actually sending an email
      return NextResponse.json({ success: true, message: "Mensaje recibido correctamente." });
    }

    // 2. Validate input fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Por favor ingresa tu nombre." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Por favor ingresa un correo electrónico válido." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json({ error: "Por favor escribe un mensaje más detallado (al menos 5 caracteres)." }, { status: 400 });
    }

    // 3. Verify Captcha
    const captchaResult = verifyCaptcha(captchaAnswer, captchaToken, clientTimestamp);
    if (!captchaResult.valid) {
      return NextResponse.json(
        { error: captchaResult.reason || "Código de seguridad incorrecto." },
        { status: 400 }
      );
    }

    // 4. Send Email via Hostinger SMTP
    try {
      await sendContactEmail({
        name: name.trim(),
        email: email.trim(),
        phone: phone ? String(phone).trim() : "",
        message: message.trim(),
        ip,
      });

      return NextResponse.json({
        success: true,
        message: "¡Tu mensaje ha sido enviado con éxito! Te responderemos a la brevedad.",
      });
    } catch (emailError: any) {
      console.error("[CONTACT_SMTP_ERROR]", emailError);

      // Distinguish SMTP authentication / connection errors vs fatal errors
      const errMsg = emailError?.message || "Error al conectar con el servidor de correo.";
      
      return NextResponse.json(
        {
          error: `No se pudo enviar el correo en este momento (${errMsg}). Si es urgente, por favor comunicate por WhatsApp.`,
          smtpError: true,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[CONTACT_API_ERROR]", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al procesar el mensaje." },
      { status: 500 }
    );
  }
}
