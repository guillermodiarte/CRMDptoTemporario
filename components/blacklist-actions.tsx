"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import { BlacklistEntry } from "@prisma/client";
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

interface BlacklistActionsProps {
  data: (BlacklistEntry & { reportedBy?: { name: string | null; email: string | null } | null })[];
}

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------

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
    link.download = `blacklist_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Lista Negra", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

    const tableRows = data.map(entry => [
      entry.guestName.substring(0, 20),
      entry.guestPhone || "",
      entry.reason.substring(0, 30),
      entry.reportedBy?.name || "Sistema",
      format(new Date(entry.createdAt), "dd/MM/yyyy")
    ]);

    autoTable(doc, {
      head: [["Huésped", "Teléfono", "Motivo", "Reportado", "Fecha"]],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
    });

    doc.save(`blacklist_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

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
      if (!entry.guestName) errors.push("Falta Nombre");
      if (!entry.guestPhone) errors.push("Falta Teléfono");
      if (!entry.reason) errors.push("Falta Motivo");

      // 3. Validate Date Formats
      if (entry.checkIn && !isValid(parse(entry.checkIn, "yyyy-MM-dd", new Date()))) {
        errors.push("CheckIn inválido (YYYY-MM-DD)");
      }
      if (entry.checkOut && !isValid(parse(entry.checkOut, "yyyy-MM-dd", new Date()))) {
        errors.push("CheckOut inválido (YYYY-MM-DD)");
      }

      // 4. Validate Duplicate (Phone)
      const exists = data.some(existing =>
        existing.guestPhone?.trim() === entry.guestPhone?.trim()
      );
      if (exists) errors.push("Teléfono ya existe en lista negra");

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
        const { _errors, _id, ...payload } = row;

        const res = await fetch("/api/blacklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          // Ignore 409 (Duplicate) if somehow passed UI check
          if (res.status === 409) {
            errors.push(`Fila ${row.guestName}: Ya existe (API)`);
            continue;
          }
          throw new Error(await res.text());
        }
        successes++;

      } catch (e: any) {
        errors.push(`Error en ${row.guestName}: ${e.message}`);
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
            <DialogTitle>Importar Lista Negra</DialogTitle>
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
                          <TableHead>Huésped</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Mensaje</TableHead>
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
                            <TableCell className="font-medium">{row.guestName || "-"}</TableCell>
                            <TableCell>{row.guestPhone}</TableCell>
                            <TableCell>{row.reason}</TableCell>
                            <TableCell className="text-xs text-red-600 font-medium">
                              {row._errors.join(", ")}
                            </TableCell>
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
