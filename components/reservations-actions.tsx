"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { Department, Reservation } from "@prisma/client";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
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
      "Personas", "Camas", "Cochera", "Total", "Seña", "Limpieza", "Insumos", "Moneda", "Estado", "Pago", "No-Show", "Lista Negra", "Motivo Lista Negra", "Fuente", "Notas"
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
        res.bedsRequired || 1,
        res.hasParking ? "SI" : "NO",
        res.totalAmount,
        res.depositAmount,
        res.cleaningFee || 0,
        res.amenitiesFee || 0,
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
            const normalizedKey = key.trim().toLowerCase().replace(/^\uFEFF/, "");
            // Map Spanish/mixed keys to English
            if (normalizedKey === "huésped" || normalizedKey === "huesped") newRow["GuestName"] = row[key];
            else if (normalizedKey === "teléfono" || normalizedKey === "telefono") newRow["GuestPhone"] = row[key];
            else if (normalizedKey === "departamento" || normalizedKey === "depto") newRow["DepartmentName"] = row[key];
            else if (normalizedKey === "check-in" || normalizedKey === "checkin") newRow["CheckIn"] = row[key];
            else if (normalizedKey === "check-out" || normalizedKey === "checkout") newRow["CheckOut"] = row[key];
            else if (normalizedKey === "personas") newRow["GuestPeopleCount"] = row[key];
            else if (normalizedKey === "camas") newRow["BedsRequired"] = row[key];
            else if (normalizedKey === "cochera" || normalizedKey === "cocheras") newRow["HasParking"] = row[key];
            else if (normalizedKey === "total") newRow["TotalAmount"] = row[key];
            else if (normalizedKey === "seña" || normalizedKey === "sena") newRow["DepositAmount"] = row[key];
            else if (normalizedKey === "limpieza") newRow["CleaningFee"] = row[key];
            else if (normalizedKey === "insumos") newRow["AmenitiesFee"] = row[key];
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

      // Enforce Parking Defaults for Preview Interaction
      if (dept && (dept as any).type === "PARKING") {
        row.GuestPeopleCount = "0";
        row.BedsRequired = "0";
        row.AmenitiesFee = "0";
      }

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
        // Check for duplicates/updates
        // Conditions: Same Phone AND Same Dates AND Same Department
        const normalizedImportPhone = normalizePhone(row.GuestPhone || "");
        const dCheckIn = row.CheckIn;
        const dCheckOut = row.CheckOut;

        const existingRes = data.find(d => {
          const existingPhone = normalizePhone(d.guestPhone || "");
          const dStart = format(new Date(d.checkIn), "yyyy-MM-dd");
          const dEnd = format(new Date(d.checkOut), "yyyy-MM-dd");

          // Exact Match: Guest Name + CheckIn + Department (CheckOut can change -> Update)
          const sameName = d.guestName.toLowerCase().trim() === (row.GuestName || "").toLowerCase().trim();
          const sameDept = d.department.name.toLowerCase() === (row.DepartmentName || "").trim().toLowerCase();

          return sameName && dStart === dCheckIn && sameDept;
        });

        if (existingRes) {
          // Compare fields and build diffs
          const diffs: Record<string, { old: any, new: any }> = {};

          if (format(new Date(existingRes.checkOut), "yyyy-MM-dd") !== row.CheckOut) {
            diffs["CheckOut"] = { old: format(new Date(existingRes.checkOut), "yyyy-MM-dd"), new: row.CheckOut };
          }

          if (parseFloat(row.TotalAmount) !== existingRes.totalAmount) {
            diffs["TotalAmount"] = { old: existingRes.totalAmount, new: parseFloat(row.TotalAmount) };
          }
          if (parseFloat(row.DepositAmount || "0") !== existingRes.depositAmount) {
            diffs["DepositAmount"] = { old: existingRes.depositAmount, new: parseFloat(row.DepositAmount || "0") };
          }
          if ((row.PaymentStatus || "UNPAID") !== existingRes.paymentStatus) {
            diffs["PaymentStatus"] = { old: existingRes.paymentStatus, new: row.PaymentStatus || "UNPAID" };
          }
          if ((row.Status || "CONFIRMED") !== existingRes.status) {
            diffs["Status"] = { old: existingRes.status, new: row.Status || "CONFIRMED" };
          }
          if ((row.Notes || "") !== (existingRes.notes || "")) {
            diffs["Notes"] = { old: existingRes.notes || "", new: row.Notes || "" };
          }
          if (parseInt(row.GuestPeopleCount || "1") !== existingRes.guestPeopleCount) {
            diffs["GuestPeopleCount"] = { old: existingRes.guestPeopleCount, new: parseInt(row.GuestPeopleCount || "1") };
          }
          if (parseInt(row.BedsRequired || "1") !== existingRes.bedsRequired) {
            diffs["BedsRequired"] = { old: existingRes.bedsRequired, new: parseInt(row.BedsRequired || "1") };
          }
          if ((row.HasParking?.toUpperCase() === "SI") !== existingRes.hasParking) {
            diffs["HasParking"] = { old: existingRes.hasParking ? "SI" : "NO", new: row.HasParking?.toUpperCase() || "NO" };
          }
          if ((row.CleaningFee ? parseFloat(row.CleaningFee) : 0) !== existingRes.cleaningFee) {
            diffs["CleaningFee"] = { old: existingRes.cleaningFee, new: row.CleaningFee ? parseFloat(row.CleaningFee) : 0 };
          }
          if ((row.AmenitiesFee ? parseFloat(row.AmenitiesFee) : 0) !== existingRes.amenitiesFee) {
            diffs["AmenitiesFee"] = { old: existingRes.amenitiesFee, new: row.AmenitiesFee ? parseFloat(row.AmenitiesFee) : 0 };
          }
          if ((row.Source || "DIRECT") !== existingRes.source) {
            diffs["Source"] = { old: existingRes.source, new: row.Source || "DIRECT" };
          }
          if (normalizePhone(row.GuestPhone || "") !== normalizePhone(existingRes.guestPhone || "")) {
            diffs["GuestPhone"] = { old: existingRes.guestPhone, new: row.GuestPhone };
          }

          if (Object.keys(diffs).length > 0) {
            statsParams.updated++;
            preview.push({
              status: "UPDATE",
              data: { ...row, _id: existingRes.id, _departmentId: dept?.id, _diff: diffs }
            });
          } else {
            statsParams.same++;
            preview.push({
              status: "SAME",
              data: { ...row, _message: "Ya existe y es idéntica" }
            });
          }
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

  const handleConfirmImport = async (rowsToProcess: ImportPreviewRow[]) => {
    setImporting(true);
    let successCount = 0;
    const importErrors: string[] = [];

    // Use selected rows passed from modal
    for (const rowObj of rowsToProcess) {
      if (rowObj.status !== "NEW" && rowObj.status !== "UPDATE") continue;
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

        // Check Department Type to enforce Parking defaults
        const dept = departments.find(d => d.id === row._departmentId);
        const isParking = dept?.type === "PARKING";

        const body = {
          guestName: row.GuestName,
          guestPhone: row.GuestPhone || "",
          guestPeopleCount: isParking ? 0 : parseInt(row.GuestPeopleCount || "1"),
          bedsRequired: isParking ? 0 : parseInt(row.BedsRequired || "1"),
          hasParking: (row.HasParking?.toUpperCase() === "SI"),
          departmentId: row._departmentId,
          checkIn: row.CheckIn,
          checkOut: row.CheckOut,
          totalAmount: parseFloat(row.TotalAmount),
          depositAmount: parseFloat(row.DepositAmount || "0"),
          cleaningFee: row.CleaningFee ? parseFloat(row.CleaningFee) : undefined,
          amenitiesFee: row.AmenitiesFee ? parseFloat(row.AmenitiesFee) : undefined,
          currency: row.Currency ? row.Currency.toUpperCase() : "ARS",
          status: row.Status || "CONFIRMED",
          paymentStatus: row.PaymentStatus || "UNPAID",
          source: row.Source || "DIRECT",
          notes: row.Notes || row.Notas || "",
          force: true
        };

        let res;
        if (rowObj.status === "UPDATE" && row._id) {
          // PATCH update
          res = await fetch(`/api/reservations/${row._id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
        } else {
          // POST create
          res = await fetch("/api/reservations", {
            method: "POST",
            body: JSON.stringify(body),
          });
        }

        if (!res.ok) {
          throw new Error("Failed");
        }
        successCount++;
      } catch (e: any) {
        importErrors.push(`Error importando ${row.GuestName}: ${e.message}`);
      }
    }

    if (importErrors.length > 0) {
      alert("Algunos errores ocurrieron:\n" + importErrors.join("\n"));
    }

    setImporting(false);
    setImportOpen(false);
    router.refresh();
  };

  // Columns definition for the modal
  // Columns definition for the modal
  const columns = [
    { header: "Huésped", accessorKey: "GuestName", cell: (val: any) => <span className="font-medium whitespace-nowrap">{val}</span> },
    { header: "Tel", accessorKey: "GuestPhone", cell: (val: any) => <span className="text-xs truncate max-w-[80px] block" title={val}>{val}</span> },
    { header: "CheckIn", accessorKey: "CheckIn" },
    { header: "CheckOut", accessorKey: "CheckOut" },
    { header: "Depto", accessorKey: "DepartmentName", cell: (val: any) => <span className="text-xs truncate max-w-[100px] block" title={val}>{val}</span> },
    { header: "Personas", accessorKey: "GuestPeopleCount" },
    { header: "Camas", accessorKey: "BedsRequired" },
    { header: "Total", accessorKey: "TotalAmount", cell: (val: any) => <span>${val}</span> },
    { header: "Seña", accessorKey: "DepositAmount", cell: (val: any) => <span>${val}</span> },
    { header: "Moneda", accessorKey: "Currency", cell: (val: any) => <span className="text-[10px]">{val}</span> },
    { header: "Fuente", accessorKey: "Source", cell: (val: any) => <span className="text-[10px]">{val}</span> },
    { header: "Limpieza", accessorKey: "CleaningFee", cell: (val: any) => val ? <span>${val}</span> : "-" },
    { header: "Insumos", accessorKey: "AmenitiesFee", cell: (val: any) => val ? <span>${val}</span> : "-" },
    { header: "Pago", accessorKey: "PaymentStatus", cell: (val: any) => <span className="text-[10px]">{val}</span> },
    { header: "Cochera", accessorKey: "HasParking" },
    { header: "Notas", accessorKey: "Notes", cell: (val: any) => <span className="truncate max-w-[80px] block text-[10px]" title={val}>{val || "-"}</span> },
    {
      header: "Error",
      accessorKey: "_errors",
      cell: (val: any) => val ? <span className="text-red-600 text-[10px] font-bold">{val.join(", ")}</span> : null
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

          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
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
