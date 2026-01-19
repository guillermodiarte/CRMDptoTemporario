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
  const [csvData, setCsvData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

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

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    doc.text("Reporte de Lista Negra", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

    const tableRows = data.map(entry => [
      entry.guestName,
      entry.guestPhone || "",
      entry.reason,
      entry.reportedBy?.name || "Sistema",
      format(new Date(entry.createdAt), "dd/MM/yyyy"),
      entry.checkIn ? format(new Date(entry.checkIn), "dd/MM/yyyy") : "-",
      entry.checkOut ? format(new Date(entry.checkOut), "dd/MM/yyyy") : "-"
    ]);

    autoTable(doc, {
      head: [["Huésped", "Teléfono", "Motivo", "Reportado", "Fecha Rep.", "Check-In", "Check-Out"]],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      columnStyles: {
        2: { cellWidth: 50 } // Motivo wider
      }
    });

    doc.save(getExportFileName("pdf"));
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

      // 4. Validate Duplicate (Phone)
      const exists = data.some(existing =>
        existing.guestPhone?.trim() === entry.guestPhone?.trim()
      );
      if (exists) {
        rowErrors.push("Teléfono ya existe en lista negra");
        entry._duplicate = true;
      }

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
        const { _errors, _id, _valid, _duplicate, ...payload } = row;

        const res = await fetch("/api/blacklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          // Ignore 409 (Duplicate) if somehow passed UI check
          if (res.status === 409) {
            globalErrors.push(`Fila ${row.guestName}: Ya existe (API)`);
            continue;
          }
          throw new Error(await res.text());
        }
        success++;

      } catch (e: any) {
        globalErrors.push(`Error en ${row.guestName}: ${e.message}`);
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
            <DialogTitle>Importar Lista Negra</DialogTitle>
            <DialogDescription>
              Carga un archivo CSV para importar miembros a la lista negra.
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
                Se importaron {successCount} entradas correctamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Huésped</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Mensaje</TableHead>
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
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={executeImport} disabled={importing || csvData.filter(r => r._valid).length === 0}>
              {importing ? "Importando..." : `Importar ${csvData.filter(r => r._valid).length} entradas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
