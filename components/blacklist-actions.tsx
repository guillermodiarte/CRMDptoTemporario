"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { format, isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import { BlacklistEntry } from "@prisma/client";
import {
  Download,
  Upload,
  FileSpreadsheet,
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

interface BlacklistActionsProps {
  data: (BlacklistEntry & { reportedBy?: { name: string | null; email: string | null } | null })[];
}

const CSV_CONFIG = [
  { label: "GuestName", key: "guestName", type: "string", required: true },
  { label: "GuestPhone", key: "guestPhone", type: "string", required: true },
  { label: "Reason", key: "reason", type: "string", required: true },
  { label: "DepartmentName", key: "departmentName", type: "string" }, // Optional
  { label: "CheckIn", key: "checkIn", type: "date" },
  { label: "CheckOut", key: "checkOut", type: "date" },
  { label: "TotalAmount", key: "totalAmount", type: "number" }
];

export function BlacklistActions({ data }: BlacklistActionsProps) {
  const router = useRouter();

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, new: 0, updated: 0, same: 0, errors: 0 });

  // --- Export Logic ---

  const getExportFileName = (ext: string) => {
    return `lista_negra_${format(new Date(), "MMMM_yyyy", { locale: es })}.${ext}`;
  };

  const exportToCSV = () => {
    const headers = ["Huésped", "Teléfono", "Motivo", "Reportado Por", "Fecha", "Check-In", "Check-Out"];

    const rows = data.map(entry => {
      return [
        `"${entry.guestName.replace(/"/g, '""')}"`,
        `"${(entry.guestPhone || "").replace(/"/g, '""')}"`,
        `"${entry.reason.replace(/"/g, '""')}"`,
        `"${(entry.reportedBy?.name || "Sistema").replace(/"/g, '""')}"`,
        format(new Date(entry.createdAt), "yyyy-MM-dd"),
        entry.checkIn ? format(new Date(entry.checkIn), "yyyy-MM-dd") : "",
        entry.checkOut ? format(new Date(entry.checkOut), "yyyy-MM-dd") : "",
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = getExportFileName("csv");
    link.click();
  };



  // --- Import Logic ---

  const downloadTemplate = () => {
    const headers = CSV_CONFIG.map(c => c.label).join(",");
    const example = "Juan Perez,123456789,Rompió una mesa,Depto 1,2024-01-01,2024-01-05,50000";
    const content = "\uFEFF" + headers + "\n" + example;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "plantilla_blacklist.csv";
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
      const entry: any = {};
      const rowErrors: string[] = [];

      // 1. Map Columns (Flexible matching)
      CSV_CONFIG.forEach(config => {
        // Try exact match first, then spanish variants
        let val = row[config.label];

        // Handle aliases if essential
        if (val === undefined) {
          const lowerKey = config.label.toLowerCase();
          const foundKey = Object.keys(row).find(k => {
            const kLow = k.toLowerCase().trim();
            if (kLow === lowerKey) return true;
            // Common aliases
            if (config.key === "guestName" && (kLow === "huesped" || kLow === "huésped")) return true;
            if (config.key === "guestPhone" && (kLow === "telefono" || kLow === "teléfono")) return true;
            if (config.key === "reason" && kLow === "motivo") return true;
            return false;
          });
          if (foundKey) val = row[foundKey];
        }

        entry[config.key] = val?.trim();
      });

      // 2. Validate Required
      if (!entry.guestName) rowErrors.push("Falta Nombre");
      if (!entry.guestPhone) rowErrors.push("Falta Teléfono");
      if (!entry.reason) rowErrors.push("Falta Motivo");

      // 3. Validate Date Formats
      if (entry.checkIn && !isValid(parse(entry.checkIn, "yyyy-MM-dd", new Date()))) {
        rowErrors.push("CheckIn inválido (YYYY-MM-DD)");
      }
      if (entry.checkOut && !isValid(parse(entry.checkOut, "yyyy-MM-dd", new Date()))) {
        rowErrors.push("CheckOut inválido (YYYY-MM-DD)");
      }

      if (rowErrors.length > 0) {
        statsParams.errors++;
        preview.push({
          status: "ERROR",
          data: { ...entry, _errors: rowErrors }
        });
      } else {
        // 4. Validate Duplicate (Phone)
        const exists = data.some(existing =>
          existing.guestPhone?.trim() === entry.guestPhone?.trim()
        );
        if (exists) {
          statsParams.same++;
          preview.push({
            status: "SAME",
            data: { ...entry, _message: "Ya existe" }
          });
        } else {
          statsParams.new++;
          preview.push({
            status: "NEW",
            data: entry
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
    const errors: string[] = [];

    const rowsToImport = selectedRows.filter(r => r.status === "NEW" || r.status === "SAME");

    for (const rowObj of rowsToImport) {
      const row = rowObj.data;
      try {
        const { _errors, _id, _valid, _duplicate, ...payload } = row;

        const res = await fetch("/api/blacklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }
        success++;
      } catch (e: any) {
        errors.push(`Error en ${row.guestName}: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      alert("Algunos errores ocurrieron:\n" + errors.join("\n"));
    }

    setImporting(false);
    setImportOpen(false);
    router.refresh();
  };

  const columns = [
    { header: "Huésped", accessorKey: "guestName" },
    { header: "Teléfono", accessorKey: "guestPhone" },
    { header: "Motivo", accessorKey: "reason" },
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
          <DropdownMenuItem onClick={() => document.getElementById("blacklist-file-upload")?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        id="blacklist-file-upload"
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
        title="Importar Lista Negra"
        rows={previewRows}
        columns={columns}
        stats={stats}
      />
    </div>
  );
}
