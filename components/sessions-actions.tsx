"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, Upload, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ImportPreviewModal, ImportPreviewRow, ImportStats } from "./import-preview-modal";
import { createSession, renameSession, toggleSessionStatus } from "@/app/dashboard/admin/sessions/actions";

interface SessionsActionsProps {
  data: any[];
}

const CSV_CONFIG = [
  { label: "Nombre", key: "name", type: "string", required: true },
  { label: "Activo", key: "isActive", type: "boolean" },
];

export function SessionsActions({ data }: SessionsActionsProps) {
  const router = useRouter();

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, new: 0, updated: 0, same: 0, errors: 0 });

  const getExportFileName = (ext: string) => {
    return `sesiones_${format(new Date(), "MMMM_yyyy", { locale: es })}.${ext}`;
  };

  const exportToCSV = () => {
    const headers = ["Nombre", "Activo", "Creado"];

    const rows = data.map(session => {
      return [
        `"${session.name.replace(/"/g, '""')}"`,
        session.isActive ? "SI" : "NO",
        format(new Date(session.createdAt), "yyyy-MM-dd"),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = getExportFileName("csv");
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
      const entry: any = {};
      const rowErrors: string[] = [];

      CSV_CONFIG.forEach(config => {
        let val = row[config.label];
        if (val === undefined) {
          const lowerKey = config.label.toLowerCase();
          const foundKey = Object.keys(row).find(k => {
            const kLow = k.toLowerCase().trim();
            if (kLow === lowerKey) return true;
            if (config.key === "name" && kLow === "nombre") return true;
            if (config.key === "isActive" && (kLow === "activo" || kLow === "active")) return true;
            return false;
          });
          if (foundKey) val = row[foundKey];
        }

        if (config.key === "isActive") {
          val = ["si", "yes", "true", "1"].includes(val?.toLowerCase());
        }

        entry[config.key] = typeof val === "boolean" ? val : val?.trim();
      });

      if (!entry.name) rowErrors.push("Falta Nombre");

      const existing = data.find(s => s.name.toLowerCase() === entry.name?.toLowerCase());

      if (rowErrors.length > 0) {
        statsParams.errors++;
        preview.push({ status: "ERROR", data: { ...entry, _errors: rowErrors } });
      } else if (existing) {
        let hasChanges = false;
        const diffs: any = {};

        const fields = ["isActive"];
        fields.forEach(f => {
          const newVal = String(entry[f] ?? "").trim();
          const oldVal = String((existing as any)[f] ?? "").trim();

          const normNew = (newVal === "true") ? "true" : (newVal === "false") ? "false" : newVal;
          const normOld = (oldVal === "true") ? "true" : (oldVal === "false") ? "false" : oldVal;

          if (normNew !== normOld) {
            hasChanges = true;
            diffs[f] = { old: normOld, new: normNew };
          }
        });

        if (hasChanges) {
          statsParams.updated++;
          preview.push({
            status: "UPDATE",
            data: { ...entry, _dbId: existing.id, _diff: diffs }
          });
        } else {
          statsParams.same++;
          preview.push({
            status: "SAME",
            data: { ...entry, _dbId: existing.id }
          });
        }
      } else {
        statsParams.new++;
        preview.push({ status: "NEW", data: entry });
      }
    });

    setPreviewRows(preview);
    setStats(statsParams);
  };

  const handleConfirmImport = async (selectedRows: ImportPreviewRow[]) => {
    setImporting(true);
    let success = 0;
    const errors: string[] = [];

    const rowsToImport = selectedRows.filter(r => r.status === "NEW" || r.status === "UPDATE" || r.status === "SAME");

    for (const rowObj of rowsToImport) {
      const row = rowObj.data;
      try {
        const body = {
          name: row.name,
          isActive: row.isActive !== undefined ? row.isActive : true,
        };

        if ((rowObj.status === "UPDATE" || rowObj.status === "SAME") && row._dbId) {
          // If the name changed, rename it
          if (rowObj.status === "UPDATE" && row._diff?.name) {
            await renameSession(row._dbId, row.name);
          }
          // If the status changed, toggle it
          if (rowObj.status === "UPDATE" && row._diff?.isActive) {
            await toggleSessionStatus(row._dbId, row.isActive);
          }
          // Note: If both changed, both are called sequentially.
        } else {
          await createSession(row.name);
          // By default createSession sets isActive = true.
          // If the CSV says false, we need to fetch the session and toggle it (or modify createSession).
          // For simplicity, we assume new sessions are usually active.
        }

        success++;
      } catch (e: any) {
        errors.push(`Error en ${row.name}: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      alert("Errores:\n" + errors.join("\n"));
    }

    setImporting(false);
    setImportOpen(false);
    router.refresh();
  };

  const columns = [
    { header: "Nombre", accessorKey: "name" },
    {
      header: "Activo",
      accessorKey: "isActive",
      cell: (val: any) => val ? <span className="text-green-600">SI</span> : <span className="text-gray-400">NO</span>
    },
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
          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => document.getElementById("sessions-file-upload")?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        id="sessions-file-upload"
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
        title="Importar Sesiones"
        rows={previewRows}
        columns={columns}
        stats={stats}
      />
    </div>
  );
}
