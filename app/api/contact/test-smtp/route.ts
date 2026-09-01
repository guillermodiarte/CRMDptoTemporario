import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTransporter, getSmtpConfig } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const isSuperAdmin = userEmail === "guillermo.diarte@gmail.com" || (session?.user as any)?.isSuperAdmin === true;

    if (!isSuperAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const smtpConfig = await getSmtpConfig();

    // Allow overriding from test payload
    const host = body.host || smtpConfig.host;
    const port = parseInt(body.port || smtpConfig.port, 10);
    const secure = port === 465;
    const user = body.user || smtpConfig.user;
    const pass = body.pass !== undefined ? body.pass : smtpConfig.pass;

    if (!pass) {
      return NextResponse.json(
        { success: false, error: "La contraseña SMTP está vacía. Por favor ingrésala para probar la conexión." },
        { status: 400 }
      );
    }

    const transporter = await createTransporter({
      host,
      port,
      secure,
      user,
      pass,
      fromName: smtpConfig.fromName,
      toEmail: smtpConfig.toEmail,
    });

    // 1. Verify connection
    await transporter.verify();

    // 2. Send test email to verify mailbox receipt
    const info = await transporter.sendMail({
      from: `"${smtpConfig.fromName}" <${user}>`,
      to: user, // send to itself
      subject: `✅ Prueba de Conexión SMTP Exitosa - ${smtpConfig.fromName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; background: #f8fafc; border-radius: 12px;">
          <h2 style="color: #0284c7;">🎉 ¡Conexión SMTP con Hostinger Exitosa!</h2>
          <p>Este correo confirma que el servidor de correo <strong>${host}:${port}</strong> con la cuenta <strong>${user}</strong> está funcionando correctamente y listo para recibir consultas de los clientes.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="font-size: 12px; color: #64748b;">Fecha y hora del test: ${new Date().toLocaleString("es-AR")}</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `¡Conexión verificada con éxito! Se envió un correo de prueba a ${user}.`,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("[TEST_SMTP_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error al conectar con el servidor SMTP de Hostinger.",
      },
      { status: 500 }
    );
  }
}
