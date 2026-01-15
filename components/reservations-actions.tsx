"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Upload, FileDown, FileSpreadsheet, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Department, Reservation } from "@prisma/client";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

import { normalizePhone } from "@/lib/phone-utils";

type ReservationWithDept = Reservation & { department: Department };

interface ReservationsActionsProps {
  data: ReservationWithDept[];
  departments: Department[];
  blacklistedPhones?: string[];
  blacklistEntries?: { guestPhone: string; reason: string; guestName: string }[];
  date?: Date; // Add date prop
}

export function ReservationsActions({ data, departments, blacklistedPhones = [], blacklistEntries = [], date = new Date() }: ReservationsActionsProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  // --- Export Logic ---

  const exportToCSV = () => {
    // ... headers and body generation ...
    const csvRows = [];
    csvRows.push([
      "Huésped", "Teléfono", "Departamento", "Check-In", "Check-Out",
      "Personas", "Total", "Seña", "Limpieza", "Moneda", "Estado", "Pago", "No-Show", "Lista Negra", "Motivo Lista Negra", "Fuente", "Notas"
    ].join(","));

    data.forEach(res => {
      // ... row generation ...
      const normalizedPhone = res.guestPhone ? normalizePhone(res.guestPhone) : "";
      const isBlacklisted = blacklistedPhones.includes(normalizedPhone);
      const blacklistEntry = blacklistEntries.find(e => normalizePhone(e.guestPhone) === normalizedPhone);
      const isNoShow = (res.status as any) === 'NO_SHOW';

      const row = [
        `"${res.guestName.replace(/"/g, '""')}"`,
        `"${(res.guestPhone || "").replace(/"/g, '""')}"`,
        `"${res.department.name.replace(/"/g, '""')}"`,
        format(new Date(res.checkIn), "yyyy-MM-dd"),
        format(new Date(res.checkOut), "yyyy-MM-dd"),
        res.guestPeopleCount,
        res.totalAmount,
        res.depositAmount,
        res.cleaningFee || 0,
        res.currency || "ARS",
        res.status,
        res.paymentStatus,
        isNoShow ? "SI" : "NO",
        isBlacklisted ? "SI" : "NO",
        `"${(blacklistEntry?.reason || "").replace(/"/g, '""')}"`,
        res.source,
        `"${(res.notes || "").replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Use Spanish month name and year
    const fileName = `reservas_${format(date, "MMMM_yyyy", { locale: es })}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Reporte de Reservas", 14, 10);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 16);
    doc.text(`Período: ${format(date, "MMMM yyyy", { locale: es })}`, 14, 21);

    const tableColumn = ["Huésped", "Depto", "In", "Out", "Total", "Limp.", "Moneda", "Estado", "Pago", "No-Show", "Blacklist", "Motivo"];
    const tableRows: any[] = [];

    data.forEach(res => {
      // ... row generation ...
      const normalizedPhone = res.guestPhone ? normalizePhone(res.guestPhone) : "";
      const isBlacklisted = blacklistedPhones.includes(normalizedPhone);
      const blacklistEntry = blacklistEntries.find(e => normalizePhone(e.guestPhone) === normalizedPhone);
      const isNoShow = (res.status as any) === 'NO_SHOW';

      const row = [
        res.guestName.substring(0, 15),
        res.department.name.substring(0, 10),
        format(new Date(res.checkIn), "dd/MM"),
        format(new Date(res.checkOut), "dd/MM"),
        `$${res.totalAmount}`,
        `$${res.cleaningFee || 0}`,
        res.currency || "ARS",
        res.status,
        res.paymentStatus,
        isNoShow ? "SI" : "NO",
        isBlacklisted ? "SI" : "NO",
        blacklistEntry?.reason?.substring(0, 15) || ""
      ];
      tableRows.push(row);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        10: { cellWidth: 25 }
      }
    });

    const fileName = `reservas_${format(date, "MMMM_yyyy", { locale: es })}.pdf`;
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
      delimiter: "", // Auto-detect delimiter
      complete: (results) => {
        const normalizedData = results.data.map((row: any) => {
          const newRow: any = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.trim().toLowerCase();
            // Map Spanish/mixed keys to English
            if (normalizedKey === "huésped" || normalizedKey === "huesped") newRow["GuestName"] = row[key];
            else if (normalizedKey === "teléfono" || normalizedKey === "telefono") newRow["GuestPhone"] = row[key];
            else if (normalizedKey === "departamento" || normalizedKey === "depto") newRow["DepartmentName"] = row[key];
            else if (normalizedKey === "check-in" || normalizedKey === "checkin") newRow["CheckIn"] = row[key];
            else if (normalizedKey === "check-out" || normalizedKey === "checkout") newRow["CheckOut"] = row[key];
            else if (normalizedKey === "personas") newRow["GuestPeopleCount"] = row[key];
            else if (normalizedKey === "total") newRow["TotalAmount"] = row[key];
            else if (normalizedKey === "seña" || normalizedKey === "sena") newRow["DepositAmount"] = row[key];
            else if (normalizedKey === "limpieza") newRow["CleaningFee"] = row[key];
            else if (normalizedKey === "moneda" || normalizedKey === "currency") newRow["Currency"] = row[key];
            else if (normalizedKey === "estado") newRow["Status"] = row[key]; // Optional
            else if (normalizedKey === "pago") newRow["PaymentStatus"] = row[key];
            else if (normalizedKey === "fuente" || normalizedKey === "source") newRow["Source"] = row[key];
            else if (normalizedKey === "notas") newRow["Notes"] = row[key];
            else if (normalizedKey === "lista negra" || normalizedKey === "listanegra") newRow["IsBlacklisted"] = row[key];
            else if (normalizedKey === "motivo lista negra") newRow["BlacklistReason"] = row[key];
            else newRow[key] = row[key];
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
      if (!row.DepartmentName) issues.push("Falta DepartmentName (o Depto)");
      if (!row.CheckIn) issues.push("Falta CheckIn (YYYY-MM-DD)");
      if (!row.CheckOut) issues.push("Falta CheckOut (YYYY-MM-DD)");
      if (!row.TotalAmount) issues.push("Falta TotalAmount (o Total)");

      // Validate Department
      const dept = departments.find(d => d.name.toLowerCase() === (row.DepartmentName || "").toLowerCase());
      if (!dept && row.DepartmentName) issues.push(`Departamento no encontrado: ${row.DepartmentName}`);

      // Validate Dates
      if (row.CheckIn && !isValid(parse(row.CheckIn, "yyyy-MM-dd", new Date()))) issues.push("CheckIn inválido (Formato YYYY-MM-DD)");
      if (row.CheckOut && !isValid(parse(row.CheckOut, "yyyy-MM-dd", new Date()))) issues.push("CheckOut inválido (Formato YYYY-MM-DD)");
      if (row.Currency && !["ARS", "USD"].includes(row.Currency.toUpperCase())) issues.push("Moneda inválida (ARS/USD)");

      if (issues.length > 0) {
        // Mark as error
        validationErrors.push(`Fila ${rowNum}: ${issues.join(", ")}`);
        // We add error property to row for visual highlighting if needed
        row._error = issues.join("; ");
      } else {
        // Check for duplicates in EXISTING data
        const normalizedImportPhone = normalizePhone(row.GuestPhone || "");

        // Conditions: Same Phone AND Same CheckIn AND Same CheckOut
        // (We could relax to just overlapping dates, but user asked for specifics)
        const duplicate = data.find(d => {
          const existingPhone = normalizePhone(d.guestPhone || "");
          // Simple exact match on dates string (CSV) vs Date object (DB)
          // DB dates are objects. Need to format them to compare with CSV string "YYYY-MM-DD"
          const dCheckIn = format(new Date(d.checkIn), "yyyy-MM-dd");
          const dCheckOut = format(new Date(d.checkOut), "yyyy-MM-dd");

          return existingPhone === normalizedImportPhone &&
            dCheckIn === row.CheckIn &&
            dCheckOut === row.CheckOut;
        });

        if (duplicate) {
          row._warning = "Reserva duplicada (será ignorada)";
          row._duplicate = true;
        } else {
          row._departmentId = dept?.id;
          row._valid = true;
        }
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

    const validRows = csvData.filter(r => r._valid && !r._duplicate);

    for (const row of validRows) {
      try {
        // 1. Check for Blacklist auto-creation
        if (row.IsBlacklisted === "SI" || row.ListaNegra === "SI") {
          const phone = row.GuestPhone || "";
          const normalized = normalizePhone(phone);
          const reason = row.BlacklistReason || row.MotivoListaNegra || "Importado sin motivo";

          // Check if already in our CLIENT SIDE list (optimistic check) to save API calls
          // But better to let API handle duplicates gracefully
          if (phone && !blacklistedPhones.includes(normalized)) {
            try {
              await fetch("/api/blacklist", {
                method: "POST",
                body: JSON.stringify({
                  guestName: row.GuestName,
                  guestPhone: phone,
                  reason: reason,
                  departmentName: row.DepartmentName,
                  checkIn: row.CheckIn,
                  checkOut: row.CheckOut,
                })
              });
              // Verify if 409 (duplicate) - we ignore it.
            } catch (e) {
              console.error("Error creating blacklist entry", e);
              // Continue to create reservation anyway
            }
          }
        }

        const body = {
          guestName: row.GuestName,
          guestPhone: row.GuestPhone || "",
          guestPeopleCount: parseInt(row.GuestPeopleCount || "1"),
          departmentId: row._departmentId,
          checkIn: row.CheckIn,
          checkOut: row.CheckOut,
          totalAmount: parseFloat(row.TotalAmount),
          depositAmount: parseFloat(row.DepositAmount || "0"),
          cleaningFee: row.CleaningFee ? parseFloat(row.CleaningFee) : undefined, // Import CleaningFee
          currency: row.Currency ? row.Currency.toUpperCase() : "ARS",
          status: "CONFIRMED", // Default for import
          paymentStatus: row.PaymentStatus || "UNPAID",
          source: row.Source || "DIRECT",
          notes: row.Notes || row.Notas || "",
          force: true
        };

        const res = await fetch("/api/reservations", {
          method: "POST",
          body: JSON.stringify(body),
        });

        if (!res.ok) {
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
      // If all good, close and refresh
      setTimeout(() => {
        setImportOpen(false);
        router.refresh();
      }, 1500);
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const headers = ["GuestName", "GuestPhone", "DepartmentName", "CheckIn", "CheckOut", "GuestPeopleCount", "TotalAmount", "DepositAmount", "CleaningFee", "Currency", "PaymentStatus", "Source", "IsBlacklisted", "BlacklistReason", "Notes"];
    const example = ["Juan Perez", "123456789", departments[0]?.name || "Depto 1", "2024-01-01", "2024-01-05", "2", "50000", "10000", "5000", "ARS", "UNPAID", "DIRECT", "NO", "", "Nota de ejemplo"];

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), example.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_reservas.csv");
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
            <DialogTitle>Importar Reservas</DialogTitle>
            <DialogDescription>
              Carga un archivo CSV para importar reservas masivamente.
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
                Se importaron {successCount} reservas correctamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Huésped</TableHead>
                  <TableHead>Depto</TableHead>
                  <TableHead>CheckIn</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Limpieza</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead>Lista Negra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    <TableCell>{row.DepartmentName}</TableCell>
                    <TableCell>{row.CheckIn}</TableCell>
                    <TableCell>{row.TotalAmount}</TableCell>
                    <TableCell>{row.CleaningFee || "-"}</TableCell>
                    <TableCell>{row.Currency || "ARS"}</TableCell>
                    <TableCell>{row.IsBlacklisted === "SI" ? "SI" : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={processImport} disabled={importing || csvData.filter(r => r._valid).length === 0}>
              {importing ? "Importando..." : `Importar ${csvData.filter(r => r._valid).length} Reservas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
