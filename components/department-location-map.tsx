"use client";

import { useState } from "react";
import { MapPin, ExternalLink, Map, AlertTriangle } from "lucide-react";

interface DeptLocation {
  deptName: string;
  address?: string | null;
  googleMapsLink?: string | null;
  nights?: number;
}

interface DepartmentLocationMapProps {
  /** Single department location */
  address?: string | null;
  googleMapsLink?: string | null;
  deptName?: string;
  /** Multi-location mode (for combined reservations) */
  locations?: DeptLocation[];
  mode?: "compact" | "expanded";
}

function buildEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

function buildSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function SingleLocationMap({
  address,
  googleMapsLink,
  deptName,
  mode = "compact",
}: {
  address?: string | null;
  googleMapsLink?: string | null;
  deptName?: string;
  mode?: "compact" | "expanded";
}) {
  const [mapError, setMapError] = useState(false);
  const embedUrl = address ? buildEmbedUrl(address) : null;
  const directUrl = googleMapsLink || (address ? buildSearchUrl(address) : null);
  const mapHeight = mode === "expanded" ? "h-72" : "h-52";

  if (!address && !googleMapsLink) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
      {/* Map Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/15">
            <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-white tracking-wide uppercase">Ubicación</p>
            {address && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{address}</p>
            )}
          </div>
        </div>
        {directUrl && (
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 px-3 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir mapa
          </a>
        )}
      </div>

      {/* Map Embed */}
      {embedUrl && !mapError ? (
        <div className={`relative ${mapHeight} w-full`}>
          <iframe
            src={embedUrl}
            title={`Mapa de ${deptName || "ubicación"}`}
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onError={() => setMapError(true)}
          />
        </div>
      ) : mapError && directUrl ? (
        <div className={`${mapHeight} flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-4`}>
          <Map className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">No se pudo cargar el mapa</p>
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold text-sky-600 dark:text-sky-400 underline underline-offset-4"
          >
            <ExternalLink className="w-4 h-4" /> Ver en Google Maps
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function DepartmentLocationMap({
  address,
  googleMapsLink,
  deptName,
  locations,
  mode = "compact",
}: DepartmentLocationMapProps) {
  // Multi-location mode
  if (locations && locations.length > 0) {
    const validLocations = locations.filter(l => l.address || l.googleMapsLink);
    if (validLocations.length === 0) return null;

    // Check if all in same location
    const uniqueAddresses = new Set(validLocations.map(l => (l.address || "").trim().toLowerCase()));
    const sameLocation = uniqueAddresses.size <= 1 && uniqueAddresses.values().next().value !== "";
    const firstLocation = validLocations[0];

    if (sameLocation) {
      return (
        <div className="space-y-3">
          {/* Same location badge */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl">
            <div className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Misma ubicación para toda tu estadía
            </p>
          </div>
          <SingleLocationMap
            address={firstLocation.address}
            googleMapsLink={firstLocation.googleMapsLink}
            deptName={firstLocation.deptName}
            mode={mode}
          />
        </div>
      );
    }

    // Different locations
    return (
      <div className="space-y-3">
        {/* Warning banner */}
        <div className="flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Departamentos en distintas ubicaciones</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5 leading-relaxed">
              Esta reserva incluye departamentos en distintas zonas. Revisá las ubicaciones de cada tramo.
            </p>
          </div>
        </div>

        {/* Each location */}
        <div className="space-y-3">
          {validLocations.map((loc, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-600 dark:bg-sky-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{loc.deptName}</p>
                  {loc.nights !== undefined && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{loc.nights} noche{loc.nights !== 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>
              <SingleLocationMap
                address={loc.address}
                googleMapsLink={loc.googleMapsLink}
                deptName={loc.deptName}
                mode="compact"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single department mode
  return (
    <SingleLocationMap
      address={address}
      googleMapsLink={googleMapsLink}
      deptName={deptName}
      mode={mode}
    />
  );
}
