"use client";

import { useState } from "react";
import { Department } from "@prisma/client";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
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
}

const CSV_CONFIG = [
  { label: "Nombre", key: "name", type: "string", required: true },
  { label: "Dirección", key: "address", type: "string" },
  { label: "Alias", key: "alias", type: "string" },
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

export function DepartmentsActions({ data, role }: DepartmentsActionsProps) {
  const router = useRouter();

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, new: 0, updated: 0, same: 0, errors: 0 });

  // --- Export Logic ---

  const getExportFileName = (ext: string) => {
    return `departamentos_${format(new Date(), "MMMM_yyyy", { locale: es })}.${ext}`;
  };

  const handleExportCSV = () => {
    const exportData = data.filter(d => !(d as any).isArchived); // Only active
    if (!exportData.length) return alert("No hay datos para exportar.");

    const headers = CSV_CONFIG.map(c => c.label).join(",");
    const rows = exportData.map(d => {
      return CSV_CONFIG.map(col => {
        const val = (d as any)[col.key];
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

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    doc.text("Reporte de Departamentos", 14, 10);
    doc.setFontSize(8);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 16);

    const exportData = data.filter(d => !(d as any).isArchived);

    const tableRows = exportData.map(d => [
      d.name,
      d.description || "",
      d.address || "",
      d.maxPeople,
      d.bedCount,
      `$${d.basePrice}`,
      `$${d.cleaningFee || 0}`,
      (d as any).currency || "ARS",
      d.alias || "",
      (d as any).allowPets ? "SI" : "NO",
      d.hasParking ? "SI" : "NO",
      d.wifiName || "",
      d.wifiPass || "",
      (d as any).managerName || "",
      (d as any).keyLocation || "",     // Typed as any if property not on type yet
      (d as any).lockBoxCode || "",
      (d as any).meterLuz || "",
      (d as any).meterGas || "",
      (d as any).meterAgua || "",
      (d as any).ownerName || "",
      (d as any).inventoryNotes || ""
    ]);

    autoTable(doc, {
      startY: 20,
      head: [[
        "Nombre", "Desc.", "Dirección", "Cap.", "Camas",
        "Precio", "Limp.", "Mon.", "Alias",
        "Pet", "Park", "Wifi", "Pass", "Encargado",
        "Llaves", "Locker", "Luz", "Gas", "Agua", "Dueño", "Notas"
      ]],
      body: tableRows,
      styles: { fontSize: 5, cellPadding: 1 }, // Very small font for many columns
      columnStyles: {
        0: { cellWidth: 15 }, // Nombre
        1: { cellWidth: 20 }, // Desc
        2: { cellWidth: 20 }, // Dirección
        20: { cellWidth: 20 } // Notas
      }
    });
    doc.save(getExportFileName("pdf"));
  };

  // --- Import Logic ---

  const downloadTemplate = () => {
    const headers = CSV_CONFIG.map(c => c.label).join(",");
    const example = CSV_CONFIG.map(c => {
      if (c.key === "name") return "Depto Ejemplo";
      if (c.type === "number") return "4";
      if (c.type === "currency") return "50000";
      if (c.type === "boolean") return "Si";
      return "Texto";
    }).join(",");
    const content = "\uFEFF" + headers + "\n" + example;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "plantilla_departamentos.csv";
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
        validateAndSetPreview(result.data);
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
        // Find matching header key (case-insensitive fuzzy match)
        const rowKey = Object.keys(row).find(k =>
          k.toLowerCase().replace(/[^a-z]/g, "") === config.label.toLowerCase().replace(/[^a-z]/g, "")
        );

        let val = row[rowKey || ""]?.trim();

        if (config.type === "number" || config.type === "currency") {
          val = val ? parseFloat(val) : 0;
        } else if (config.type === "boolean") {
          val = ["si", "yes", "true", "1"].includes(val?.toLowerCase());
        }

        dept[config.key] = val;
      });

      // 2. Validate Required
      if (!dept.name) rowErrors.push("Nombre es obligatorio");

      if (rowErrors.length > 0) {
        statsParams.errors++;
        preview.push({
          status: "ERROR",
          data: { ...dept, _errors: rowErrors }
        });
      } else {
        // 3. Check for duplicates/updates
        const existing = data.find(d =>
          !(d as any).isArchived &&
          d.name.trim().toLowerCase() === String(dept.name || "").trim().toLowerCase()
        );

        if (existing) {
          // Check if any field differs
          let hasChanges = false;
          CSV_CONFIG.forEach(config => {
            if (config.key === "name") return; // Key match
            const newVal = dept[config.key];
            const oldVal = (existing as any)[config.key];

            // Simple comparison
            if (String(newVal) !== String(oldVal ?? (config.type === "number" ? 0 : ""))) {
              // Loose equality for numbers/strings
              hasChanges = true;
            }
          });

          if (hasChanges) {
            statsParams.updated++;
            preview.push({
              status: "UPDATE",
              data: { ...dept, _dbId: existing.id }
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

  const handleConfirmImport = async () => {
    setImporting(true);
    let success = 0;
    const globalErrors: string[] = [];

    // Filter NEW and UPDATE
    const rowsToProcess = previewRows.filter(r => r.status === "NEW" || r.status === "UPDATE");

    for (const rowObj of rowsToProcess) {
      const payload = rowObj.data;
      const { _errors, _dbId, ...dataFields } = payload;

      try {
        const body = {
          color: "#3b82f6",
          isActive: true,
          ...dataFields
        };

        let res;
        if (rowObj.status === "UPDATE" && _dbId) {
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

  const columns = [
    { header: "Nombre", accessorKey: "name" },
    { header: "Dirección", accessorKey: "address" },
    {
      header: "Precio",
      accessorKey: "basePrice",
      cell: (val: any) => <span>${val}</span>
    },
    { header: "WiFi", accessorKey: "wifiName" },
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
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" /> Exportar PDF
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
        title="Importar Departamentos"
        rows={previewRows}
        columns={columns}
        stats={stats}
      />
    </div>
  );
}
