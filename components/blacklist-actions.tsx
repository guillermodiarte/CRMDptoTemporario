"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle, FileDown } from "lucide-react";
import { useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { format, isValid, parse } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BlacklistEntry } from "@prisma/client";
import { es } from "date-fns/locale";

// ... existing imports ...

interface BlacklistActionsProps {
  data: (BlacklistEntry & { reportedBy?: { name: string | null; email: string | null } | null })[];
}

export function BlacklistActions({ data }: BlacklistActionsProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  // --- Export Logic ---

  const exportToCSV = () => {
    const csvRows = [];
    // Headers
    csvRows.push([
      "Huésped", "Teléfono", "Motivo", "Reportado Por", "Fecha", "Check-In", "Check-Out"
    ].join(","));

    // Body
    data.forEach(entry => {
      const row = [
        `"${entry.guestName.replace(/"/g, '""')}"`,
        `"${(entry.guestPhone || "").replace(/"/g, '""')}"`,
        `"${entry.reason.replace(/"/g, '""')}"`,
        `"${(entry.reportedBy?.name || "Sistema").replace(/"/g, '""')}"`,
        format(new Date(entry.createdAt), "yyyy-MM-dd"),
        entry.checkIn ? format(new Date(entry.checkIn), "yyyy-MM-dd") : "",
        entry.checkOut ? format(new Date(entry.checkOut), "yyyy-MM-dd") : "",
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Use Spanish month name and year
    const fileName = `blacklist_${format(new Date(), "MMMM_yyyy", { locale: es })}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Lista Negra", 14, 10);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 16);
    doc.text(`Período: ${format(new Date(), "MMMM yyyy", { locale: es })}`, 14, 21);

    const tableColumn = ["Huésped", "Teléfono", "Motivo", "Reportado", "Fecha"];
    const tableRows: any[] = [];

    data.forEach(entry => {
      const row = [
        entry.guestName.substring(0, 20),
        entry.guestPhone || "",
        entry.reason.substring(0, 30),
        entry.reportedBy?.name || "Sistema",
        format(new Date(entry.createdAt), "dd/MM/yyyy")
      ];
      tableRows.push(row);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8 },
    });

    const fileName = `blacklist_${format(new Date(), "MMMM_yyyy", { locale: es })}.pdf`;
    doc.save(fileName);
  };

  // --- Import Logic ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvData([]);
    setErrors([]);
    setSuccessCount(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const normalizedData = results.data.map((row: any) => {
          const newRow: any = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.trim().toLowerCase();
            if (normalizedKey === "huésped" || normalizedKey === "huesped") newRow["GuestName"] = row[key];
            else if (normalizedKey === "teléfono" || normalizedKey === "telefono") newRow["GuestPhone"] = row[key];
            else if (normalizedKey === "motivo") newRow["Reason"] = row[key];
            else if (normalizedKey === "departamento" || normalizedKey === "depto") newRow["DepartmentName"] = row[key];
            else if (normalizedKey === "check-in" || normalizedKey === "checkin") newRow["CheckIn"] = row[key];
            else if (normalizedKey === "check-out" || normalizedKey === "checkout") newRow["CheckOut"] = row[key];
            else if (normalizedKey === "total") newRow["TotalAmount"] = row[key];
            else newRow[key] = row[key]; // Keep original if no match (e.g. GuestName)
          });
          return newRow;
        });
        validateAndSetPreview(normalizedData);
      },
      error: (err) => {
        setErrors(["Error al leer el archivo CSV: " + err.message]);
      }
    });
  };

  const validateAndSetPreview = (rows: any[]) => {
    const validRows: any[] = [];
    const validationErrors: string[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const issues: string[] = [];

      // Required fields
      if (!row.GuestName) issues.push("Falta GuestName (o Huésped)");
      if (!row.GuestPhone) issues.push("Falta GuestPhone (o Teléfono)");
      if (!row.Reason) issues.push("Falta Reason (o Motivo)");

      // Validate Dates if present
      if (row.CheckIn && !isValid(parse(row.CheckIn, "yyyy-MM-dd", new Date()))) issues.push("CheckIn inválido (Formato YYYY-MM-DD)");
      if (row.CheckOut && !isValid(parse(row.CheckOut, "yyyy-MM-dd", new Date()))) issues.push("CheckOut inválido (Formato YYYY-MM-DD)");

      if (issues.length > 0) {
        validationErrors.push(`Fila ${rowNum}: ${issues.join(", ")}`);
        row._error = issues.join("; ");
      } else {
        row._valid = true;
      }
      validRows.push(row);
    });

    setCsvData(validRows);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
    }
  };

  const processImport = async () => {
    setImporting(true);
    let success = 0;
    const errors: string[] = [];

    const validRows = csvData.filter(r => r._valid);

    for (const row of validRows) {
      try {
        const body = {
          guestName: row.GuestName,
          guestPhone: row.GuestPhone,
          reason: row.Reason,
          departmentName: row.DepartmentName, // Optional context
          checkIn: row.CheckIn,
          checkOut: row.CheckOut,
          totalAmount: row.TotalAmount
        };

        const res = await fetch("/api/blacklist", {
          method: "POST",
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          if (res.status === 409) {
            // Duplicate, just skip silently
            continue;
          }
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        success++;
      } catch (e: any) {
        console.error("Import error", e);
        errors.push(`Error importando ${row.GuestName}: ${e.message}`);
      }
    }

    setSuccessCount(success);
    if (errors.length > 0) {
      setErrors(prev => [...prev, ...errors]);
    } else {
      setTimeout(() => {
        setImportOpen(false);
        router.refresh();
      }, 1500);
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const headers = ["GuestName", "GuestPhone", "Reason", "DepartmentName", "CheckIn", "CheckOut", "TotalAmount"];
    const example = ["Juan Malo", "123456789", "Rompió todo", "Depto 1", "2024-01-01", "2024-01-05", "50000"];

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), example.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_blacklist.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar Lista Negra</DialogTitle>
            <DialogDescription>
              Carga un archivo CSV para importar registros masivamente.
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
                Se importaron {successCount} registros correctamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Huésped</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Sube un archivo CSV para previsualizar.
                    </TableCell>
                  </TableRow>
                )}
                {csvData.map((row, i) => (
                  <TableRow key={i} className={row._valid ? "bg-white" : row._duplicate ? "bg-yellow-50" : "bg-red-50"}>
                    <TableCell>
                      {row._valid ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                        row._duplicate ? <AlertCircle className="h-4 w-4 text-yellow-500" /> :
                          <AlertCircle className="h-4 w-4 text-red-500" />}
                    </TableCell>
                    <TableCell>
                      {row.GuestName}
                      {row._warning && <div className="text-xs text-yellow-600 font-medium">{row._warning}</div>}
                    </TableCell>
                    <TableCell>{row.GuestPhone}</TableCell>
                    <TableCell>{row.Reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={processImport} disabled={importing || csvData.filter(r => r._valid).length === 0}>
              {importing ? "Importando..." : `Importar ${csvData.filter(r => r._valid).length} Registros`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
