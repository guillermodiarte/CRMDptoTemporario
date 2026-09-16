"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuickReply } from "@/lib/site.config";
import { toast } from "sonner";
import Link from "next/link";
import {
  ClipboardCopy,
  Check,
  Settings,
  Hotel,
  MessageCircle,
  Star,
  Zap,
} from "lucide-react";

interface QuickRepliesWidgetProps {
  replies: QuickReply[];
}

export function QuickRepliesWidget({ replies }: QuickRepliesWidgetProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (reply: QuickReply) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(reply.content);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = reply.content;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }

      setCopiedId(reply.id);
      toast.success(`Copiado: "${reply.title}"`, {
        description: "Listo para pegar en WhatsApp o cualquier chat.",
      });

      setTimeout(() => {
        setCopiedId((prev) => (prev === reply.id ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err);
      toast.error("No se pudo copiar automáticamente");
    }
  };

  const getButtonVisuals = (category?: string, title?: string) => {
    const combined = `${category || ""} ${title || ""}`.toLowerCase();

    if (combined.includes("booking")) {
      return {
        icon: Hotel,
        badgeBg: "bg-blue-600 text-white",
        activeBorder: "border-blue-500/40 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30",
        label: "Booking",
      };
    }
    if (combined.includes("direct") || combined.includes("whatsapp")) {
      return {
        icon: MessageCircle,
        badgeBg: "bg-emerald-600 text-white",
        activeBorder: "border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30",
        label: "Directo",
      };
    }
    if (combined.includes("airbnb")) {
      return {
        icon: Star,
        badgeBg: "bg-rose-500 text-white",
        activeBorder: "border-rose-500/40 hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/30",
        label: "Airbnb",
      };
    }

    return {
      icon: Zap,
      badgeBg: "bg-slate-700 text-white",
      activeBorder: "border-slate-300 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50",
      label: category || "General",
    };
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Header Label */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ClipboardCopy className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Respuestas Rápidas
              </span>
              <span className="text-[11px] text-muted-foreground hidden md:inline ml-2">
                (Toca un botón para copiar y pegar en WhatsApp)
              </span>
            </div>
          </div>

          {/* Buttons Row */}
          <div className="flex flex-wrap items-center gap-2 flex-1 sm:justify-end">
            {replies.map((reply) => {
              const isCopied = copiedId === reply.id;
              const { icon: Icon, badgeBg, activeBorder, label } = getButtonVisuals(reply.category, reply.title);

              return (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => handleCopy(reply)}
                  title={reply.title}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 select-none ${
                    isCopied
                      ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/30"
                      : `bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 ${activeBorder}`
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 text-white animate-in zoom-in" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <span className={`p-1 rounded-md text-[10px] ${badgeBg}`}>
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="truncate max-w-[180px] sm:max-w-[220px]">
                        {reply.title}
                      </span>
                      <ClipboardCopy className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors ml-0.5" />
                    </>
                  )}
                </button>
              );
            })}

            {/* Quick Link to Settings */}
            <Link
              href="/dashboard/settings?tab=respuestas"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Configurar respuestas en SuperAdmin"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
