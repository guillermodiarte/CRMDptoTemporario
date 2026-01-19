"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Department, Expense, ExpenseType } from "@prisma/client";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  FileDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  CheckCircle2
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FinanceActionsProps {
  expenses: (Expense & { department: { name: string } | null })[];
  departments: Department[];
  date?: Date;
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

export function FinanceActions({ expenses, departments, date = new Date() }: FinanceActionsProps) {
  const router = useRouter();

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

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

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Finanzas", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);
    doc.text(`Período: ${format(date, "MMMM yyyy", { locale: es })}`, 14, 28);

    const tableRows = expenses.map(exp => [
      format(new Date(exp.date), "dd/MM"),
      TYPE_LABELS[exp.type]?.substring(0, 15) || exp.type,
      exp.description.substring(0, 20),
      exp.department?.name.substring(0, 10) || "Global",
      `$${exp.amount}`
    ]);

    autoTable(doc, {
      head: [["Fecha", "Tipo", "Desc.", "Depto", "Total"]],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8 },
    });

    doc.save(getExportFileName("pdf"));
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

    setCsvData([]);
    setErrors([]);
    setSuccessCount(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => validateAndSetPreview(result.data),
      error: (err) => setErrors(["Error leyendo CSV: " + err.message])
    });
    e.target.value = "";
  };

  const validateAndSetPreview = (rows: any[]) => {
    const processed = rows.map((row, idx) => {
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
      else if (!isValid(parse(entry.date, "yyyy-MM-dd", new Date()))) rowErrors.push("Fecha inválida (YYYY-MM-DD)");

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

      return { ...entry, _errors: rowErrors, _id: idx, _valid: rowErrors.length === 0 };
    });

    setCsvData(processed);
  };

  const executeImport = async () => {
    setImporting(true);
    let success = 0;
    const globalErrors: string[] = [];

    const validRows = csvData.filter(r => r._valid);

    for (const row of validRows) {
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
        globalErrors.push(`Error en ${row.description}: ${e.message}`);
      }
    }

    setSuccessCount(success);
    if (globalErrors.length > 0) {
      setErrors(globalErrors);
    } else {
      setTimeout(() => {
        setImportOpen(false);
        router.refresh();
      }, 1500);
    }
    setImporting(false);
  };

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
          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" /> Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar Gastos</DialogTitle>
            <DialogDescription>
              Carga un archivo CSV para importar gastos masivamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 items-center my-4">
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
            <Button variant="secondary" onClick={downloadTemplate}>
              <FileDown className="mr-2 h-4 w-4" /> Template
            </Button>
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive" className="mb-4 max-h-32 overflow-y-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errores de validación</AlertTitle>
              <AlertDescription>
                <div className="text-xs">
                  {errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {successCount > 0 && (
            <Alert className="mb-4 bg-green-50 text-green-900 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Importación Parcial</AlertTitle>
              <AlertDescription>
                Se importaron {successCount} gastos correctamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Desc.</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Sube un archivo CSV para previsualizar.
                    </TableCell>
                  </TableRow>
                )}
                {csvData.map((row, i) => (
                  <TableRow key={i} className={!row._valid ? "bg-red-50" : "bg-white"}>
                    <TableCell>
                      {row._valid
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : <AlertCircle className="h-4 w-4 text-red-500" />
                      }
                    </TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell className="capitalize">{row.type?.toLowerCase()}</TableCell>
                    <TableCell>
                      {row.description}
                      {row._errors.length > 0 && (
                        <div className="text-xs text-red-600 font-medium">{row._errors.join(", ")}</div>
                      )}
                    </TableCell>
                    <TableCell>${row.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={executeImport} disabled={importing || csvData.filter(r => r._valid).length === 0}>
              {importing ? "Importando..." : `Importar ${csvData.filter(r => r._valid).length} gastos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
