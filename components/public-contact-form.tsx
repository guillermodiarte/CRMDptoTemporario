"use client";

import { useState, useEffect } from "react";
import { SiteConfig } from "@/lib/site.config";
import { Send, RefreshCw, CheckCircle2, AlertCircle, ShieldCheck, Loader2, MessageCircle } from "lucide-react";

interface CaptchaData {
  question: string;
  token: string;
  timestamp: number;
}

interface PublicContactFormProps {
  config: SiteConfig;
}

export function PublicContactForm({ config }: PublicContactFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [loadingCaptcha, setLoadingCaptcha] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [smtpError, setSmtpError] = useState(false);

  // Fetch initial captcha on mount
  const loadCaptcha = async () => {
    setLoadingCaptcha(true);
    setCaptchaAnswer("");
    try {
      const res = await fetch("/api/contact/captcha", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCaptcha(data);
      }
    } catch (e) {
      console.error("Failed to load captcha", e);
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSmtpError(false);

    if (!name.trim()) {
      setErrorMessage("Por favor ingresá tu nombre.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Por favor ingresá un correo electrónico válido.");
      return;
    }
    if (!message.trim()) {
      setErrorMessage("Por favor escribí tu consulta o mensaje.");
      return;
    }
    if (!captchaAnswer.trim()) {
      setErrorMessage("Por favor respondé a la pregunta de seguridad anti-spam.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          message,
          captchaAnswer,
          captchaToken: captcha?.token,
          clientTimestamp: captcha?.timestamp,
          honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "No se pudo enviar el mensaje.");
        setSmtpError(!!data.smtpError);
        loadCaptcha();
      } else {
        setSuccessMessage(data.message || "¡Tu consulta ha sido enviada con éxito!");
        setName("");
        setPhone("");
        setEmail("");
        setMessage("");
        setCaptchaAnswer("");
      }
    } catch (err: any) {
      setErrorMessage("Error de conexión al enviar el formulario. Por favor intentá nuevamente.");
      loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappDigits = config.phoneWhatsApp.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
    `Hola! Te contacto desde la web. Mi nombre es ${name || "un visitante"} y quería consultar por disponibilidad.`
  )}`;

  if (successMessage) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200/80 dark:border-slate-800 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300 transition-colors">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">¡Mensaje Enviado con Éxito!</h3>
          <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto text-sm leading-relaxed">
            Hemos recibido tu consulta en <strong className="text-slate-900 dark:text-white font-semibold">{config.email}</strong>. Te responderemos a la brevedad a tu correo electrónico o teléfono.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSuccessMessage(null);
              loadCaptcha();
            }}
            className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
          >
            Enviar otro mensaje
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <MessageCircle className="w-4 h-4" />
            También consultar por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors duration-300">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Envianos un mensaje</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Completá el formulario y nos llegará un correo directo a <strong className="text-sky-600 dark:text-sky-400 font-medium">{config.email}</strong>.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-300 text-sm flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <p className="font-medium">{errorMessage}</p>
            {smtpError && (
              <div className="pt-1">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800/50 border border-green-200 dark:border-green-700/50 px-3 py-1.5 rounded-lg text-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Escribirnos directamente por WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot hidden input against spam bots */}
        <input
          type="text"
          name="website_url_honey"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre y apellido"
              disabled={submitting}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Teléfono / Celular
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 9 370 4..."
              disabled={submitting}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Email de Contacto <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tunombre@correo.com"
            disabled={submitting}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Mensaje o Consulta <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="¿En qué podemos ayudarte? Consultá por fechas, departamentos, tarifas o servicios..."
            disabled={submitting}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60"
          />
        </div>

        {/* Captcha Security Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Control de Seguridad Anti-Spam
            </label>
            <button
              type="button"
              onClick={loadCaptcha}
              disabled={loadingCaptcha || submitting}
              className="text-xs text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
              title="Generar otra pregunta"
            >
              <RefreshCw className={`w-3 h-3 ${loadingCaptcha ? "animate-spin" : ""}`} />
              Cambiar reto
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 px-4 py-2.5 rounded-xl font-mono text-sm font-bold text-slate-900 dark:text-white tracking-wide select-none shadow-sm flex items-center justify-center sm:justify-start min-w-[160px]">
              {loadingCaptcha ? (
                <span className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-normal">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...
                </span>
              ) : (
                captcha?.question || "¿Cuánto es 3 + 4?"
              )}
            </div>
            <div className="flex-1">
              <input
                type="text"
                required
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Ingresá el resultado"
                disabled={submitting || loadingCaptcha}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 font-medium"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || loadingCaptcha}
          className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-sky-600/20 hover:shadow-sky-600/30 flex items-center justify-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando mensaje...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Enviar consulta por correo
            </>
          )}
        </button>

        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
          Tu consulta llegará directamente a la casilla de recepción del alojamiento.
        </p>
      </form>
    </div>
  );
}
