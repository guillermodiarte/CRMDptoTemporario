"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, Role } from "@prisma/client";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  FileDown
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

interface UsersActionsProps {
  data: User[];
}

const CSV_CONFIG = [
  { label: "Name", key: "name", type: "string", required: true },
  { label: "Email", key: "email", type: "string", required: true },
  { label: "Role", key: "role", type: "string", required: true },
  { label: "Phone", key: "phone", type: "string" },
  { label: "Password", key: "password", type: "string" }, // Required for creation
  { label: "IsActive", key: "isActive", type: "boolean" },
];

export function UsersActions({ data }: UsersActionsProps) {
  const router = useRouter();

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, new: 0, updated: 0, same: 0, errors: 0 });

  // --- Export Logic ---

  const getExportFileName = (ext: string) => {
    return `usuarios_${format(new Date(), "MMMM_yyyy", { locale: es })}.${ext}`;
  };

  const exportToCSV = () => {
    const headers = ["Nombre", "Email", "Rol", "Teléfono", "Activo", "Creado"];

    const rows = data.map(user => {
      return [
        `"${user.name?.replace(/"/g, '""') || ""}"`,
        `"${user.email.replace(/"/g, '""')}"`,
        user.role,
        `"${(user.phone || "").replace(/"/g, '""')}"`,
        user.isActive ? "SI" : "NO",
        format(new Date(user.createdAt), "yyyy-MM-dd"),
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
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Reporte de Usuarios", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

    const tableRows = data.map(user => [
      user.name || "-",
      user.email,
      user.role,
      user.phone || "-",
      user.isActive ? "SI" : "NO",
      format(new Date(user.createdAt), "dd/MM/yyyy")
    ]);

    autoTable(doc, {
      head: [["Nombre", "Email", "Rol", "Teléfono", "Activo", "Creado"]],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 }
    });

    doc.save(getExportFileName("pdf"));
  };

  // --- Import Logic ---

  const downloadTemplate = () => {
    const headers = CSV_CONFIG.map(c => c.label).join(",");
    const example = "Juan Perez,juan@example.com,VISUALIZER,123456,Secret123,SI";
    const content = "\uFEFF" + headers + "\n" + example;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "plantilla_usuarios.csv";
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
        validateAndSetPreview(result.data);
        setImportOpen(true);
      },
      error: (err) => alert("Error leyendo CSV: " + err.message)
    });
    e.target.value = "";
  };

  const validateAndSetPreview = (rows: any[]) => {
    const preview: ImportPreviewRow[] = [];
    let statsParams = { total: rows.length, new: 0, updated: 0, same: 0, errors: 0 };

    rows.forEach((row, idx) => {
      const entry: any = {};
      const rowErrors: string[] = [];

      // 1. Map Columns
      CSV_CONFIG.forEach(config => {
        let val = row[config.label];
        if (val === undefined) {
          const lowerKey = config.label.toLowerCase();
          const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === lowerKey);
          if (foundKey) val = row[foundKey];
        }

        if (config.key === "isActive") {
          val = ["si", "yes", "true", "1"].includes(val?.toLowerCase());
        }

        entry[config.key] = typeof val === "boolean" ? val : val?.trim();
      });

      // 2. Validate
      if (!entry.name) rowErrors.push("Falta Nombre");
      if (!entry.email) rowErrors.push("Falta Email");
      if (!entry.role || !["ADMIN", "VISUALIZER"].includes(entry.role.toUpperCase())) {
        rowErrors.push("Rol inválido (ADMIN/VISUALIZER)");
      } else {
        entry.role = entry.role.toUpperCase();
      }

      // 3. Check Duplicate (Email)
      const exists = data.find(u => u.email.toLowerCase() === entry.email?.toLowerCase());

      if (exists) {
        statsParams.same++;
        preview.push({
          status: "SAME",
          data: { ...entry, _message: "Ya existe" }
        });
      } else {
        if (!entry.password) rowErrors.push("Falta Contraseña (para nuevos)");

        if (rowErrors.length > 0) {
          statsParams.errors++;
          preview.push({
            status: "ERROR",
            data: { ...entry, _errors: rowErrors }
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

  const handleConfirmImport = async () => {
    setImporting(true);
    let success = 0;
    const errors: string[] = [];

    const rowsToImport = previewRows.filter(r => r.status === "NEW");

    for (const rowObj of rowsToImport) {
      const row = rowObj.data;
      try {
        const body = {
          name: row.name,
          email: row.email,
          password: row.password,
          role: row.role,
          phone: row.phone,
          isActive: row.isActive !== undefined ? row.isActive : true,
          image: ""
        };

        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error(await res.text());
        success++;
      } catch (e: any) {
        errors.push(`Error en ${row.email}: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      alert("Errores:\n" + errors.join("\n"));
    }

    setImporting(false);
    setImportOpen(false);
    router.refresh();
  };

  const columns = [
    { header: "Nombre", accessorKey: "name" },
    { header: "Email", accessorKey: "email" },
    { header: "Rol", accessorKey: "role" },
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
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" /> Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => document.getElementById("users-file-upload")?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        id="users-file-upload"
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
        title="Importar Usuarios"
        rows={previewRows}
        columns={columns}
        stats={stats}
      />
    </div>
  );
}
