"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { format, isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Department, Expense, ExpenseType } from "@prisma/client";
import {
  Download,
  Upload,
  FileSpreadsheet
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

interface FinanceActionsProps {
  expenses: (Expense & { department: { name: string } | null })[];
  departments: Department[];
  date?: Date;
  onExportPDF?: () => void;
}

// ------------------------------------------------------------------
// CONFIGURATION & HELPERS
// ------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  SUPPLY: "Insumos y Mantenimiento",
  TAX: "Impuestos y Servicios",
  COMMISSION: "Comisión",
};

const REVERSE_TYPE_LABELS: Record<string, ExpenseType> = {
  "insumos": "SUPPLY",
  "insumos y mantenimiento": "SUPPLY",
  "mantenimiento": "SUPPLY",
  "impuestos": "TAX",
  "impuestos y servicios": "TAX",
  "servicios": "TAX",
  "comisión": "COMMISSION",
  "comision": "COMMISSION",
  "comisiones": "COMMISSION"
};

const CSV_CONFIG = [
  { label: "Fecha", key: "date", type: "date", required: true },
  { label: "Tipo", key: "type", type: "string", required: true },
  { label: "Descripción", key: "description", type: "string", required: true },
  { label: "Total", key: "amount", type: "number", required: true },
  { label: "Departamento", key: "departmentName", type: "string" },
  { label: "Cantidad", key: "quantity", type: "number" },
  { label: "Precio Unitario", key: "unitPrice", type: "number" }
];

export function FinanceActions({ expenses, departments, date = new Date(), onExportPDF }: FinanceActionsProps) {
  const router = useRouter();

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, new: 0, updated: 0, same: 0, errors: 0 });

  // --- Export Logic ---

  const getExportFileName = (ext: string) => {
    return `finanzas_${format(date, "MMMM_yyyy", { locale: es })}.${ext}`;
  };

  const exportToCSV = () => {
    const headers = CSV_CONFIG.map(c => c.label).join(",");

    const rows = expenses.map(exp => {
      return [
        format(new Date(exp.date), "yyyy-MM-dd"),
        `"${TYPE_LABELS[exp.type] || exp.type}"`,
        `"${exp.description.replace(/"/g, '""')}"`,
        exp.amount,
        `"${(exp.department?.name || "Global").replace(/"/g, '""')}"`,
        exp.quantity || 1,
        exp.unitPrice || 0
      ].join(",");
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
    const example = "2024-01-30,Insumos,Compra de papel,5000,Depto 1,2,2500";
    const content = "\uFEFF" + headers + "\n" + example;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "plantilla_finanzas.csv";
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

    rows.map((row, idx) => {
      const entry: any = {};
      const rowErrors: string[] = [];

      // 1. Map Columns (Flexible)
      CSV_CONFIG.forEach(config => {
        let val = row[config.label];

        // Key Mapping (Aliases)
        if (val === undefined) {
          const lowerKey = config.label.toLowerCase();
          const foundKey = Object.keys(row).find(k => {
            const kLow = k.toLowerCase().trim();
            if (kLow === lowerKey) return true;
            // Aliases
            if (config.key === "description" && (kLow === "descripcion" || kLow === "desc")) return true;
            if (config.key === "amount" && (kLow === "monto" || kLow === "precio")) return true;
            if (config.key === "departmentName" && kLow === "depto") return true;
            if (config.key === "unitPrice" && kLow === "precio unitario") return true;
            return false;
          });
          if (foundKey) val = row[foundKey];
        }

        entry[config.key] = val?.trim();
      });

      // 2. Validate & Normalize

      // Date
      if (!entry.date) rowErrors.push("Falta Fecha");
      else if (!isValid(parse(entry.date, "yyyy-MM-dd", new Date()))) rowErrors.push("Fecha inválida");

      // Amount
      if (!entry.amount) rowErrors.push("Falta Monto");
      else {
        entry.amount = parseFloat(entry.amount);
        if (isNaN(entry.amount)) rowErrors.push("Monto inválido");
      }
      entry.quantity = entry.quantity ? parseInt(entry.quantity) : 1;
      entry.unitPrice = entry.unitPrice ? parseFloat(entry.unitPrice) : undefined;

      // Department
      if (entry.departmentName && entry.departmentName.toLowerCase() !== "global") {
        const dept = departments.find(d => d.name.toLowerCase() === entry.departmentName.toLowerCase());
        if (!dept) rowErrors.push(`Depto no encontrado: ${entry.departmentName}`);
        else entry._departmentId = dept.id;
      }

      // Type
      if (!entry.type) rowErrors.push("Falta Tipo");
      else {
        const typeKey = entry.type.toLowerCase();
        const mapped = REVERSE_TYPE_LABELS[typeKey];
        if (!mapped && !Object.values(ExpenseType).includes(entry.type)) {
          rowErrors.push(`Tipo desconocido: ${entry.type}`);
        } else {
          entry.type = mapped || entry.type;
        }
      }

      if (!entry.description) rowErrors.push("Falta Descripción");

      if (rowErrors.length > 0) {
        statsParams.errors++;
        preview.push({
          status: "ERROR",
          data: { ...entry, _errors: rowErrors }
        });
      } else {
        // 3. Check for Duplicates (Date + Amount + Description + Dept)
        const duplicate = expenses.find(e => {
          const eDate = format(new Date(e.date), "yyyy-MM-dd");
          const eAmount = e.amount;
          const eDesc = e.description.toLowerCase();
          const eDeptId = e.departmentId; // can be null

          const iDate = entry.date;
          const iAmount = entry.amount;
          const iDesc = (entry.description || "").toLowerCase();
          const iDeptId = entry._departmentId || null;

          // Type check
          const eType = e.type;
          const iType = entry.type;

          return eDate === iDate &&
            eAmount === iAmount &&
            eDesc === iDesc &&
            eDeptId === iDeptId &&
            eType === iType;
        });

        if (duplicate) {
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

    // Filter NEW rows from selection (and SAME if user explicitly attempts to duplicate)
    const rowsToImport = selectedRows.filter(r => r.status === "NEW" || r.status === "SAME");

    for (const rowObj of rowsToImport) {
      const row = rowObj.data;
      try {
        const body = {
          type: row.type,
          description: row.description,
          amount: row.amount,
          departmentId: row._departmentId,
          date: row.date,
          quantity: row.quantity,
          unitPrice: row.unitPrice
        };

        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error(await res.text());
        success++;
      } catch (e: any) {
        errors.push(`Error en ${row.description}: ${e.message}`);
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
    { header: "Fecha", accessorKey: "date" },
    { header: "Tipo", accessorKey: "type", cell: (val: string) => <span className="capitalize">{(val || "").toLowerCase()}</span> },
    { header: "Desc.", accessorKey: "description" },
    {
      header: "Monto",
      accessorKey: "amount",
      cell: (val: any) => <span>${val}</span>
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
          {onExportPDF && (
            <DropdownMenuItem onClick={onExportPDF}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar PDF (Visual)
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
          </DropdownMenuItem>


          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => document.getElementById("finance-file-upload")?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        id="finance-file-upload"
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
        title="Importar Gastos"
        rows={previewRows}
        columns={columns}
        stats={stats}
      />
    </div>
  );
}
