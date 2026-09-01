import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config-loader";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  toEmail: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const config = await getSiteConfig();

  // Look for custom DB settings
  const smtpKeys = ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_name"];
  let dbSettings: Record<string, string> = {};

  try {
    const records = await prisma.systemSettings.findMany({
      where: {
        key: { in: smtpKeys },
        sessionId: null,
      },
    });
    dbSettings = Object.fromEntries(records.map((r) => [r.key, r.value]));
  } catch (e) {
    console.error("Error fetching SMTP settings from DB:", e);
  }

  const host = dbSettings.smtp_host || process.env.SMTP_HOST || "smtp.hostinger.com";
  const port = parseInt(dbSettings.smtp_port || process.env.SMTP_PORT || "465", 10);
  const secure = port === 465;
  const user = dbSettings.smtp_user || process.env.SMTP_USER || "contacto@alojamientosdiarte.com";
  const pass = dbSettings.smtp_password || process.env.SMTP_PASSWORD || "";
  const fromName = dbSettings.smtp_from_name || config.siteName || "Alojamientos Di'Arte";
  const toEmail = config.email || "contacto@alojamientosdiarte.com";

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromName,
    toEmail,
  };
}

export async function createTransporter(smtpConfig?: SmtpConfig) {
  const cfg = smtpConfig || (await getSmtpConfig());

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    tls: {
      rejectUnauthorized: false, // Prevents self-signed cert issues during DNS propagation
    },
  });
}

export interface ContactMessageData {
  name: string;
  email: string;
  phone: string;
  message: string;
  ip?: string;
}

export async function sendContactEmail(data: ContactMessageData) {
  const smtpConfig = await getSmtpConfig();

  if (!smtpConfig.pass) {
    console.warn("[EMAIL_SEND] SMTP Password is not configured yet in .env (SMTP_PASSWORD) or Settings.");
  }

  const transporter = await createTransporter(smtpConfig);

  const cleanPhone = data.phone ? data.phone.replace(/[^\d+]/g, "") : "";
  const whatsappDigits = data.phone ? data.phone.replace(/\D/g, "") : "";
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null;

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #38bdf8; }
    .header p { margin: 0; font-size: 14px; color: #cbd5e1; }
    .content { padding: 32px 24px; }
    .field { margin-bottom: 20px; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 4px; }
    .value { font-size: 15px; color: #0f172a; font-weight: 500; }
    .message-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-wrap; }
    .actions { display: flex; gap: 12px; margin-top: 28px; padding-top: 24px; border-top: 1px solid #f1f5f9; }
    .btn { display: inline-block; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; text-align: center; }
    .btn-reply { background: #0284c7; color: #ffffff !important; }
    .btn-whatsapp { background: #22c55e; color: #ffffff !important; }
    .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Nueva Consulta desde la Web</h1>
      <p>${smtpConfig.fromName} - Formulario de Contacto</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Nombre del Remitente</div>
        <div class="value">${data.name}</div>
      </div>
      <div class="field">
        <div class="label">Correo Electrónico</div>
        <div class="value"><a href="mailto:${data.email}" style="color: #0284c7; text-decoration: none;">${data.email}</a></div>
      </div>
      <div class="field">
        <div class="label">Teléfono / WhatsApp</div>
        <div class="value">${data.phone ? `<a href="tel:${cleanPhone}" style="color: #0f172a; text-decoration: none;">${data.phone}</a>` : '<span style="color: #94a3b8;">No especificado</span>'}</div>
      </div>
      <div class="field">
        <div class="label">Mensaje</div>
        <div class="message-box">${data.message}</div>
      </div>

      <div class="actions">
        <a href="mailto:${data.email}?subject=Re:%20Consulta%20-%20${encodeURIComponent(smtpConfig.fromName)}" class="btn btn-reply">✉️ Responder al Correo</a>
        ${whatsappUrl ? `<a href="${whatsappUrl}" target="_blank" class="btn btn-whatsapp">💬 Chatear por WhatsApp</a>` : ''}
      </div>
    </div>
    <div class="footer">
      Recibido el ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} hs • IP: ${data.ip || "desconocida"}
    </div>
  </div>
</body>
</html>
`;

  const info = await transporter.sendMail({
    from: `"${smtpConfig.fromName}" <${smtpConfig.user}>`,
    to: smtpConfig.toEmail,
    replyTo: `"${data.name}" <${data.email}>`,
    subject: `📩 Nueva Consulta Web de ${data.name}`,
    text: `Nueva consulta desde la web:\n\nNombre: ${data.name}\nEmail: ${data.email}\nTeléfono: ${data.phone || "No especificado"}\n\nMensaje:\n${data.message}\n\n---\nEnviado desde el formulario de contacto.`,
    html: htmlContent,
  });

  return info;
}
