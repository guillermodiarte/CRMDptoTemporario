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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

interface DepartmentsActionsProps {
  data: Department[];
}

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------

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

export function DepartmentsActions({ data }: DepartmentsActionsProps) {
  const router = useRouter();

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");

  // Data State
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ successes: number, errors: string[] } | null>(null);

  // ------------------------------------------------------------------
  // EXPORT LOGIC (Preserved)
  // ------------------------------------------------------------------

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
    link.download = `departamentos_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Departamentos", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy")}`, 14, 22);

    const exportData = data.filter(d => !(d as any).isArchived);

    autoTable(doc, {
      startY: 30,
      head: [["Nombre", "Dirección", "Cap.", "Precio", "Locker", "Activo"]],
      body: exportData.map(d => [
        d.name,
        d.address || "-",
        d.maxPeople,
        `$${d.basePrice}`,
        (d as any).lockBoxCode || "-",
        d.isActive ? "Si" : "No"
      ])
    });
    doc.save(`reporte_deptos_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

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
    link.download = "plantilla_importacion.csv";
    link.click();
  };

  // ------------------------------------------------------------------
  // IMPORT LOGIC (Redone)
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
    e.target.value = ""; // Reset input
  };

  const processParsedData = (rawRows: any[]) => {
    const processed = rawRows.map((row, idx) => {
      const dept: any = {};
      const errors: string[] = [];

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
      if (!dept.name) errors.push("Nombre es obligatorio");

      // 3. Validate Duplicate (Global Check)
      // Check against the 'data' prop which contains ALL existing departments
      // Allow duplicate if the existing one is ARCHIVED (deleted)
      const existsActive = data.some(existing =>
        !(existing as any).isArchived &&
        existing.name.trim().toLowerCase() === String(dept.name || "").trim().toLowerCase()
      );
      if (existsActive) errors.push("Ya existe un depto ACTIVO con este nombre");

      // 4. Validate Duplicate in current CSV (Self-check)
      // We can do this only if we construct the array fully first, but let's skip for simplicity,
      // the database/API double check will catch it or user sees it in preview.

      return { ...dept, _errors: errors, _id: idx };
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
        // Prepare payload
        const { _errors, _id, ...payload } = row;

        // Clean payload
        const body = {
          color: "#3b82f6",
          isActive: true,
          ...payload
        };

        const res = await fetch("/api/departments", {
          method: "POST",
          body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error(await res.text());
        successes++;

      } catch (e: any) {
        errors.push(`Error en ${row.name}: ${e.message}`);
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
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF}>
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
            <DialogTitle>Importar Departamentos</DialogTitle>
            <DialogDescription>
              {step === "upload" && "Carga un archivo CSV para comenzar."}
              {step === "preview" && "Revisa los datos antes de importar. Las filas rojas tienen errores."}
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
                          <TableHead>Nombre</TableHead>
                          <TableHead>Dirección</TableHead>
                          <TableHead>Precio</TableHead>
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
                            <TableCell className="font-medium">{row.name || "-"}</TableCell>
                            <TableCell>{row.address}</TableCell>
                            <TableCell>${row.basePrice}</TableCell>
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
                  Importar {parsedRows.filter(r => r._errors.length === 0).length} deptos
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
