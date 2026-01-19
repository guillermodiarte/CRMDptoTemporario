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
  CheckCircle2,
  AlertCircle,
  X,
  Trash2
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");

  // Data State
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ successes: number, errors: string[] } | null>(null);

  // ------------------------------------------------------------------
  // EXPORT LOGIC
  // ------------------------------------------------------------------

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

  // ------------------------------------------------------------------
  // IMPORT LOGIC
  // ------------------------------------------------------------------

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => processParsedData(result.data),
      error: (err) => alert("Error leyendo CSV: " + err.message)
    });
    e.target.value = "";
  };

  const processParsedData = (rawRows: any[]) => {
    const processed = rawRows.map((row, idx) => {
      const entry: any = {};
      const errors: string[] = [];

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
      if (!entry.date) errors.push("Falta Fecha");
      else if (!isValid(parse(entry.date, "yyyy-MM-dd", new Date()))) errors.push("Fecha inválida (YYYY-MM-DD)");

      // Amount
      if (!entry.amount) errors.push("Falta Monto");
      else {
        entry.amount = parseFloat(entry.amount);
        if (isNaN(entry.amount)) errors.push("Monto inválido");
      }
      entry.quantity = entry.quantity ? parseInt(entry.quantity) : 1;
      entry.unitPrice = entry.unitPrice ? parseFloat(entry.unitPrice) : undefined;

      // Department
      if (entry.departmentName && entry.departmentName.toLowerCase() !== "global") {
        const dept = departments.find(d => d.name.toLowerCase() === entry.departmentName.toLowerCase());
        if (!dept) errors.push(`Depto no encontrado: ${entry.departmentName}`);
        else entry._departmentId = dept.id;
      }

      // Type
      if (!entry.type) errors.push("Falta Tipo");
      else {
        const typeKey = entry.type.toLowerCase();
        const mapped = REVERSE_TYPE_LABELS[typeKey];
        if (!mapped && !Object.values(ExpenseType).includes(entry.type)) {
          errors.push(`Tipo desconocido: ${entry.type}`);
        } else {
          entry.type = mapped || entry.type;
        }
      }

      if (!entry.description) errors.push("Falta Descripción");

      return { ...entry, _errors: errors, _id: idx };
    });

    setParsedRows(processed);
    setStep("preview");
  };

  const executeImport = async () => {
    setIsImporting(true);
    const validRows = parsedRows.filter(r => r._errors.length === 0);
    let successes = 0;
    const errors: string[] = [];

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
        successes++;

      } catch (e: any) {
        errors.push(`Error en ${row.description}: ${e.message}`);
      }
    }

    setImportSummary({ successes, errors });
    setStep("result");
    setIsImporting(false);
    if (successes > 0) router.refresh();
  };

  const reset = () => {
    setIsOpen(false);
    setStep("upload");
    setParsedRows([]);
    setImportSummary(null);
  };

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  return (
    <>
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
          <DropdownMenuItem onClick={() => setIsOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={open => !open && reset()}>
        <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Importar Gastos</DialogTitle>
            <DialogDescription>
              {step === "upload" && "Carga un archivo CSV para comenzar."}
              {step === "preview" && "Revisa los datos antes de importar."}
              {step === "result" && "Resumen de la importación."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden p-6 pt-2">

            {/* STEP 1: UPLOAD */}
            {step === "upload" && (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/10">
                <div className="text-center space-y-4">
                  <div className="bg-primary/10 p-4 rounded-full inline-block">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium">Sube tu archivo CSV</h3>
                  <div className="flex flex-col gap-2">
                    <Input type="file" accept=".csv" onChange={handleFileUpload} className="cursor-pointer" />
                    <Button variant="link" onClick={downloadTemplate}>
                      <FileDown className="mr-2 h-4 w-4" /> Descargar Plantilla
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PREVIEW */}
            {step === "preview" && (
              <div className="h-full flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Se encontraron <strong>{parsedRows.length}</strong> filas.
                    <span className="text-green-600 ml-2 font-medium">
                      {parsedRows.filter(r => r._errors.length === 0).length} Válidas
                    </span>
                    <span className="text-red-600 ml-2 font-medium">
                      {parsedRows.filter(r => r._errors.length > 0).length} Erróneas
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
                    <X className="mr-2 h-4 w-4" /> Cancelar
                  </Button>
                </div>

                <div className="border rounded-md flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[50px]">Status</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Desc.</TableHead>
                          <TableHead>Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedRows.map((row, i) => (
                          <TableRow key={i} className={row._errors.length > 0 ? "bg-red-50 hover:bg-red-100" : ""}>
                            <TableCell>
                              {row._errors.length === 0
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
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* STEP 3: RESULT */}
            {step === "result" && importSummary && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                  <h2 className="text-2xl font-bold">{importSummary.successes} Importados</h2>
                  <p className="text-muted-foreground">El proceso ha finalizado.</p>
                </div>

                {importSummary.errors.length > 0 && (
                  <div className="w-full max-w-md border rounded-md bg-red-50 p-4 text-left">
                    <p className="font-bold text-red-700 mb-2">Errores:</p>
                    <ScrollArea className="h-32">
                      <ul className="text-xs text-red-600 space-y-1">
                        {importSummary.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-2 bg-muted/20 border-t">
            {step === "upload" && <Button variant="ghost" onClick={() => setIsOpen(false)}>Cerrar</Button>}
            {step === "preview" && (
              <>
                <Button variant="outline" onClick={() => setStep("upload")}>Atrás</Button>
                <Button
                  onClick={executeImport}
                  disabled={isImporting || parsedRows.filter(r => r._errors.length === 0).length === 0}
                >
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importar {parsedRows.filter(r => r._errors.length === 0).length}
                </Button>
              </>
            )}
            {step === "result" && (
              <Button onClick={reset} className="w-full">Finalizar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
