"use client";

import { useState } from "react";
import { Department } from "@prisma/client";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileDown
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ImportPreviewModal, ImportPreviewRow, ImportStats } from "./import-preview-modal";

interface DepartmentsActionsProps {
  data: Department[];
  role?: string;
  defaultType?: "APARTMENT" | "PARKING";
}

const CSV_CONFIG = [
  { label: "Nombre", key: "name", type: "string", required: true },
  { label: "Dirección", key: "address", type: "string" },
  { label: "Alias", key: "alias", type: "string" }, // ... existing
  { label: "Tipo", key: "type", type: "string" }, // Added Type
  { label: "Descripción Interna", key: "description", type: "string" }, // Added Description
  { label: "Color", key: "color", type: "string" },
  { label: "Activo", key: "isActive", type: "boolean" },
  { label: "Capacidad", key: "maxPeople", type: "number" },
  { label: "Camas", key: "bedCount", type: "number" },
  { label: "Precio Base", key: "basePrice", type: "currency" },
  { label: "Limpieza", key: "cleaningFee", type: "currency" },
  { label: "WiFi Nombre", key: "wifiName", type: "string" },
  { label: "WiFi Pass", key: "wifiPass", type: "string" },
  { label: "Ubicación Llaves", key: "keyLocation", type: "string" },
  { label: "Cód. Locker", key: "lockBoxCode", type: "string" },
  { label: "Propietario", key: "ownerName", type: "string" },
  { label: "Link Maps", key: "googleMapsLink", type: "string" },
  { label: "Link Airbnb", key: "airbnbLink", type: "string" },
  { label: "Link Booking", key: "bookingLink", type: "string" },
  { label: "Medidor Luz", key: "meterLuz", type: "string" },
  { label: "Medidor Gas", key: "meterGas", type: "string" },
  { label: "Medidor Agua", key: "meterAgua", type: "string" },
  { label: "Medidor WiFi", key: "meterWifi", type: "string" },
  { label: "Notas Inventario", key: "inventoryNotes", type: "string" }
];

export function DepartmentsActions({ data, role, defaultType = "APARTMENT" }: DepartmentsActionsProps) {
  const router = useRouter();

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, new: 0, updated: 0, same: 0, errors: 0 });

  const entityName = defaultType === "PARKING" ? "Cocheras" : "Departamentos";
  const fileNamePrefix = defaultType === "PARKING" ? "cocheras" : "departamentos";

  // --- Export Logic ---

  const getExportFileName = (ext: string) => {
    return `${fileNamePrefix}_${format(new Date(), "MMMM_yyyy", { locale: es })}.${ext}`;
  };

  const handleExportCSV = () => {
    const exportData = data.filter(d => !(d as any).isArchived); // Only active
    if (!exportData.length) return alert("No hay datos para exportar.");

    const headers = CSV_CONFIG.map(c => c.label).join(",");
    const rows = exportData.map(d => {
      return CSV_CONFIG.map(col => {
        let val = (d as any)[col.key];

        // Export Type explicitly if present, else fallback to defaultType of context
        if (col.key === "type") val = (d as any).type || defaultType;

        if (col.type === "boolean") return val ? "Si" : "No";
        if (val === null || val === undefined) return "";
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",");
    });

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = getExportFileName("csv");
    link.click();
  };



  // --- Import Logic ---

  const downloadTemplate = () => {
    const headers = CSV_CONFIG.map(c => c.label).join(",");
    const example = CSV_CONFIG.map(c => {
      if (c.key === "name") return defaultType === "PARKING" ? "Cochera A" : "Depto Ejemplo";
      if (c.key === "type") return defaultType;
      if (c.key === "description") return "Descripción interna del departamento o cochera";
      if (c.type === "number") return "4";
      if (c.type === "currency") return "50000";
      if (c.type === "boolean") return "Si";
      return "Texto";
    }).join(",");
    const content = "\uFEFF" + headers + "\n" + example;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `plantilla_${fileNamePrefix}.csv`;
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewRows([]);
    setStats({ total: 0, new: 0, updated: 0, same: 0, errors: 0 });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        // Normalize keys (strip BOM)
        const normalizedData = result.data.map((row: any) => {
          const newRow: any = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim().replace(/^\uFEFF/, "");
            newRow[cleanKey] = row[key];
          });
          return newRow;
        });
        validateAndSetPreview(normalizedData);
        setImportOpen(true);
      },
      error: (err) => alert("Error leyendo CSV: " + err.message)
    });
    e.target.value = "";
  };

  const validateAndSetPreview = (rows: any[]) => {
    const preview: ImportPreviewRow[] = [];
    let statsParams = { total: rows.length, new: 0, updated: 0, same: 0, errors: 0 };

    rows.forEach((row, idx) => {
      const dept: any = {};
      const rowErrors: string[] = [];

      // 1. Map Columns
      CSV_CONFIG.forEach(config => {
        // Find matching header key (case-insensitive fuzzy match with accent normalization)
        const normalizeHeader = (h: string) =>
          h.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

        const configLabelNorm = normalizeHeader(config.label);

        const rowKey = Object.keys(row).find(k => {
          const keyNorm = normalizeHeader(k);
          // Exact match on label
          if (keyNorm === configLabelNorm) return true;
          // Match on key (e.g. "description" vs "description")
          if (keyNorm === normalizeHeader(config.key)) return true;

          // Common Aliases
          if (config.key === "description") {
            if (keyNorm === "desc" || keyNorm === "descinterna" || keyNorm === "descripcion" || keyNorm === "descripcioninterna") return true;
            if (keyNorm.includes("interna") || keyNorm.includes("descrip")) return true;
          }
          if (config.key === "lockBoxCode" && (keyNorm === "codlocker" || keyNorm === "locker")) return true;
          return false;
        });

        // Note: If header not found, val is undefined. If found but empty, it's ""
        let val: any = undefined;
        if (rowKey) {
          val = row[rowKey]?.trim() || "";
          // Boolean handling
          if (config.type === "boolean") {
            val = ["si", "yes", "true", "1"].includes(val.toLowerCase());
          } else if (config.type === "number" || config.type === "currency") {
            val = val ? parseFloat(val) : 0;
          }
        }

        dept[config.key] = val;
      });

      // 2. Validate Required
      if (!dept.name) rowErrors.push("Nombre es obligatorio");

      // 3. Strict Type Check
      // If CSV has a specific type, check compatibility. If column missing (val=undefined), ignore check?
      // Safest to assume if "Type" column is missing, we default to context.
      // If "Type" column is present, we validate.
      if (dept.type !== undefined && dept.type.toUpperCase() !== defaultType) {
        rowErrors.push(`Tipo incorrecto: se encontró ${dept.type}, se espera ${defaultType}`);
      } else {
        // Force context type if missing or valid
        dept.type = defaultType;
      }

      if (rowErrors.length > 0) {
        statsParams.errors++;
        preview.push({
          status: "ERROR",
          data: { ...dept, _errors: rowErrors }
        });
      } else {
        // 4. Check for duplicates/updates
        const existing = data.find(d =>
          !(d as any).isArchived &&
          d.name.trim().toLowerCase() === String(dept.name || "").trim().toLowerCase()
        );

        if (existing) {
          // Check if any field differs
          let hasChanges = false;
          const diffs: any = {};

          CSV_CONFIG.forEach(config => {
            if (config.key === "name" || config.key === "type") return; // Key match & Type controlled

            const newVal = dept[config.key];
            if (newVal === undefined) return; // Skip if column was missing in CSV

            const oldVal = (existing as any)[config.key];

            // Normalize for comparison
            const normNew = String(newVal).trim(); // newVal is guaranteed not undefined here

            let normOld = "";
            if (config.type === "currency" || config.type === "number") {
              normOld = String(oldVal ?? 0).trim();
              // Handle 0 vs "0"
              if (parseFloat(normNew) === parseFloat(normOld)) return;
            } else {
              normOld = String(oldVal ?? "").trim();
            }

            if (normNew !== normOld) {
              hasChanges = true;
              diffs[config.key] = { old: normOld, new: normNew };
            }
          });

          if (hasChanges) {
            statsParams.updated++;
            preview.push({
              status: "UPDATE",
              data: { ...dept, _dbId: existing.id, _diff: diffs }
            });
          } else {
            statsParams.same++;
            preview.push({
              status: "SAME",
              data: { ...dept, _dbId: existing.id }
            });
          }
        } else {
          statsParams.new++;
          preview.push({
            status: "NEW",
            data: dept
          });
        }
      }
    });

    setPreviewRows(preview);
    setStats(statsParams);
  };

  const handleConfirmImport = async (selectedRows: ImportPreviewRow[]) => {
    setImporting(true);
    let success = 0;
    const globalErrors: string[] = [];

    // Process only selected rows
    const rowsToProcess = selectedRows;

    for (const rowObj of rowsToProcess) {
      const payload = rowObj.data;
      const { _errors, _dbId, ...dataFields } = payload;

      try {
        const body = {
          color: "#3b82f6",
          isActive: true,
          ...dataFields,
          type: defaultType // Enforce current context type
        };

        let res;
        if ((rowObj.status === "UPDATE" || rowObj.status === "SAME") && _dbId) {
          res = await fetch(`/api/departments/${_dbId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
        } else {
          res = await fetch("/api/departments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
        }

        if (!res.ok) throw new Error(await res.text());
        success++;
      } catch (e: any) {
        globalErrors.push(`Error en ${payload.name || "fila"}: ${e.message}`);
      }
    }

    if (globalErrors.length > 0) {
      alert("Errores:\n" + globalErrors.join("\n"));
    }

    setImporting(false);
    setImportOpen(false);
    router.refresh();
  };

  // Dynamic columns from CSV_CONFIG to show ALL attributes
  const columns = [
    ...CSV_CONFIG.map(config => ({
      header: config.label,
      accessorKey: config.key,
      cell: (val: any) => {
        if (config.type === "boolean") return val ? "Si" : "No";
        if (config.type === "currency") return <span>${val}</span>;
        if (typeof val === "string" && val.length > 30) {
          return <span className="block max-w-[150px] truncate text-xs" title={val}>{val}</span>;
        }
        return <span className="text-xs">{val}</span>;
      }
    })),
    {
      header: "Error",
      accessorKey: "_errors",
      cell: (val: any) => val ? <span className="text-red-600 text-xs font-bold">{val.join(", ")}</span> : null
    }
  ];

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar / Importar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV {entityName}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => document.getElementById("dept-file-upload")?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        id="dept-file-upload"
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      <ImportPreviewModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onConfirm={handleConfirmImport}
        isImporting={importing}
        title={`Importar ${entityName}`}
        rows={previewRows}
        columns={columns}
        stats={stats}
      />
    </div>
  );
}
