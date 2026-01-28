"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, Upload, FileSpreadsheet, FileText } from "lucide-react";
import { Department, Reservation } from "@prisma/client";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { normalizePhone } from "@/lib/phone-utils";
import { ImportPreviewModal, ImportPreviewRow, ImportStats } from "./import-preview-modal";

type ReservationWithDept = Reservation & { department: Department };

interface ReservationsActionsProps {
  data: ReservationWithDept[];
  departments: Department[];
  blacklistedPhones?: string[];
  blacklistEntries?: { guestPhone: string; reason: string; guestName: string }[];
  date?: Date;
}

export function ReservationsActions({ data, departments, blacklistedPhones = [], blacklistEntries = [], date = new Date() }: ReservationsActionsProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, new: 0, updated: 0, same: 0, errors: 0 });

  // --- Export Logic ---

  const getExportFileName = (ext: string) => {
    return `reservas_${format(date, "MMMM_yyyy", { locale: es })}.${ext}`;
  };

  const exportToCSV = () => {
    const csvRows = [];
    csvRows.push([
      "Huésped", "Teléfono", "Departamento", "Check-In", "Check-Out",
      "Personas", "Total", "Seña", "Limpieza", "Moneda", "Estado", "Pago", "No-Show", "Lista Negra", "Motivo Lista Negra", "Fuente", "Notas"
    ].join(","));

    data.forEach(res => {
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

    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = getExportFileName("csv");
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

    const tableColumn = [
      "Huésped", "Teléfono", "Depto", "Personas",
      "In", "Out", "Total", "Seña", "Limp.",
      "Moneda", "Estado", "Pago",
      "No-Show", "Blacklist", "Motivo", "Fuente", "Notas"
    ];
    const tableRows: any[] = [];

    data.forEach(res => {
      const normalizedPhone = res.guestPhone ? normalizePhone(res.guestPhone) : "";
      const isBlacklisted = blacklistedPhones.includes(normalizedPhone);
      const blacklistEntry = blacklistEntries.find(e => normalizePhone(e.guestPhone) === normalizedPhone);
      const isNoShow = (res.status as any) === 'NO_SHOW';

      const row = [
        res.guestName,
        res.guestPhone || "",
        res.department.name,
        res.guestPeopleCount || 1,
        format(new Date(res.checkIn), "dd/MM"),
        format(new Date(res.checkOut), "dd/MM"),
        `$${res.totalAmount}`,
        `$${res.depositAmount || 0}`,
        `$${res.cleaningFee || 0}`,
        res.currency || "ARS",
        res.status,
        res.paymentStatus,
        isNoShow ? "SI" : "NO",
        isBlacklisted ? "SI" : "NO",
        blacklistEntry?.reason || "",
        res.source || "",
        res.notes || ""
      ];
      tableRows.push(row);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 6 }, // Reduced font size to fit columns
      columnStyles: {
        0: { cellWidth: 20 }, // Huésped
        14: { cellWidth: 20 }, // Motivo
        16: { cellWidth: 20 }  // Notas
      }
    });

    doc.save(getExportFileName("pdf"));
  };

  // --- Import Logic ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewRows([]);
    setStats({ total: 0, new: 0, updated: 0, same: 0, errors: 0 });

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
        setImportOpen(true);
      },
      error: (err) => {
        alert("Error al leer el archivo CSV: " + err.message);
      }
    });

    e.target.value = ""; // Reset input
  };

  const validateAndSetPreview = (rows: any[]) => {
    const preview: ImportPreviewRow[] = [];
    let statsParams = { total: rows.length, new: 0, updated: 0, same: 0, errors: 0 };

    rows.forEach((row, index) => {
      const issues: string[] = [];

      // Required fields
      if (!row.GuestName) issues.push("Falta Huésped");
      if (!row.DepartmentName) issues.push("Falta Depto");
      if (!row.CheckIn) issues.push("Falta CheckIn");
      if (!row.CheckOut) issues.push("Falta CheckOut");
      if (!row.TotalAmount) issues.push("Falta Total");

      // Validate Department
      const dept = departments.find(d => d.name.toLowerCase() === (row.DepartmentName || "").toLowerCase());
      if (!dept && row.DepartmentName) issues.push(`Depto no encontrado: ${row.DepartmentName}`);

      // Validate Dates
      if (row.CheckIn && !isValid(parse(row.CheckIn, "yyyy-MM-dd", new Date()))) issues.push("CheckIn inválido");
      if (row.CheckOut && !isValid(parse(row.CheckOut, "yyyy-MM-dd", new Date()))) issues.push("CheckOut inválido");

      const currency = row.Currency ? row.Currency.toUpperCase() : "ARS";
      if (!["ARS", "USD"].includes(currency)) issues.push("Moneda inválida");

      if (issues.length > 0) {
        statsParams.errors++;
        preview.push({
          status: "ERROR",
          data: { ...row, _errors: issues }
        });
      } else {
        // Check for duplicates
        // Conditions: Same Phone AND Same CheckIn AND Same CheckOut
        const normalizedImportPhone = normalizePhone(row.GuestPhone || "");
        const dCheckIn = row.CheckIn;
        const dCheckOut = row.CheckOut;

        const duplicate = data.find(d => {
          const existingPhone = normalizePhone(d.guestPhone || "");
          const dStart = format(new Date(d.checkIn), "yyyy-MM-dd");
          const dEnd = format(new Date(d.checkOut), "yyyy-MM-dd");
          return existingPhone === normalizedImportPhone && dStart === dCheckIn && dEnd === dCheckOut;
        });

        if (duplicate) {
          statsParams.same++;
          preview.push({
            status: "SAME",
            data: { ...row, _message: "Ya existe" }
          });
        } else {
          statsParams.new++;
          preview.push({
            status: "NEW",
            data: { ...row, _departmentId: dept?.id }
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
    const errors: string[] = [];

    // Filter only NEW rows
    const rowsToImport = previewRows.filter(r => r.status === "NEW");

    for (const rowObj of rowsToImport) {
      const row = rowObj.data;
      try {
        // 1. Check for Blacklist auto-creation
        if (row.IsBlacklisted === "SI" || row.ListaNegra === "SI") {
          const phone = row.GuestPhone || "";
          const normalized = normalizePhone(phone);
          const reason = row.BlacklistReason || row.BlackListReason || "Importado sin motivo";

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
            } catch (e) {
              console.error("Error creating blacklist entry", e);
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
          cleaningFee: row.CleaningFee ? parseFloat(row.CleaningFee) : undefined,
          currency: row.Currency ? row.Currency.toUpperCase() : "ARS",
          status: "CONFIRMED",
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
          throw new Error("Failed");
        }
        success++;
      } catch (e: any) {
        errors.push(`Error importando ${row.GuestName}`);
      }
    }

    if (errors.length > 0) {
      alert("Algunos errores ocurrieron:\n" + errors.join("\n"));
    }

    setImporting(false);
    setImportOpen(false);
    router.refresh();
  };

  // Columns definition for the modal
  const columns = [
    { header: "Huésped", accessorKey: "GuestName" },
    { header: "CheckIn", accessorKey: "CheckIn" },
    { header: "Depto", accessorKey: "DepartmentName" },
    {
      header: "Total",
      accessorKey: "TotalAmount",
      cell: (val: any, row: any) => <span>${val}</span>
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
          <Button variant="outline" className="gap-2 h-10 text-base w-[140px] md:w-auto justify-center md:justify-start px-0 md:px-4">
            <Download className="h-5 w-5" />
            <span className="md:hidden">Imp/Exp</span>
            <span className="hidden md:inline">Exportar / Importar</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" /> Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => document.getElementById("reservation-file-upload")?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        id="reservation-file-upload"
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
        title="Importar Reservas"
        rows={previewRows}
        columns={columns}
        stats={stats}
      />
    </div>
  );
}
