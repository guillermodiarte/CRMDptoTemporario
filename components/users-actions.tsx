"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User } from "@prisma/client";
import {
  Download,
  Upload,
  FileSpreadsheet
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
  { label: "Image", key: "image", type: "string" },
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
    const headers = ["Nombre", "Email", "Contraseña", "Rol", "Teléfono", "Activo", "Imagen", "Creado"];

    const rows = data.map(user => {
      return [
        `"${user.name?.replace(/"/g, '""') || ""}"`,
        `"${user.email.replace(/"/g, '""')}"`,
        `"${(user.password || "").replace(/"/g, '""')}"`,
        user.role,
        `"${(user.phone || "").replace(/"/g, '""')}"`,
        user.isActive ? "SI" : "NO",
        `"${(user.image || "").replace(/"/g, '""')}"`,
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
        // Normalize keys (strip BOM)
        const normalizedData = result.data.map((row: any) => {
          const newRow: any = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim().replace(/^\uFEFF/, "");
            newRow[cleanKey] = row[key];
          });
          return newRow;
        });
        validateAndSetPreview(normalizedData);
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
          const foundKey = Object.keys(row).find(k => {
            const kLow = k.toLowerCase().trim();
            if (kLow === lowerKey) return true;
            // Aliases
            if (config.key === "name" && kLow === "nombre") return true;
            if (config.key === "role" && kLow === "rol") return true;
            if (config.key === "phone" && (kLow === "telefono" || kLow === "teléfono")) return true;
            if (config.key === "password" && (kLow === "contraseña" || kLow === "contrasena" || kLow === "password")) return true;
            if (config.key === "isActive" && (kLow === "activo" || kLow === "active")) return true;
            if (config.key === "image" && kLow === "imagen") return true;
            return false;
          });
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
        // Allow empty role if it's an update? No, let's enforce it or default it.
        // But if CSV has "Rol" and we map it, it should be fine.
        rowErrors.push("Rol inválido (ADMIN/VISUALIZER)");
      } else {
        entry.role = entry.role.toUpperCase();
      }

      // Check errors BEFORE checking existence, or decide if updates permit partial data.
      // Usually updates should provide valid data too.
      // For password, it's optional on update.

      const existing = data.find(u => u.email.toLowerCase() === entry.email?.toLowerCase());

      if (rowErrors.length > 0) {
        // If existing, maybe we only fail if the CHANGED field is invalid? 
        // But strict is better.
        statsParams.errors++;
        preview.push({
          status: "ERROR",
          data: { ...entry, _errors: rowErrors }
        });
      } else if (existing) {
        // Diffs logic
        let hasChanges = false;
        const diffs: any = {};

        // Compare fields including PASSWORD
        const fields = ["name", "role", "phone", "isActive", "password", "image"];
        fields.forEach(f => {
          const newVal = String(entry[f] ?? "").trim();
          const oldVal = String((existing as any)[f] ?? "").trim();

          // Special password handling
          if (f === "password") {
            // If CSV password is empty, it means "no change"
            if (newVal === "") return;
            // If CSV password is provided, we compare. 
            // Note: CSV has the hashed password if exported, or plain if new.
            // DB has hash. If user re-imports export, hash == hash.
          }

          // normalize booleans for string comparison
          const normNew = (newVal === "true") ? "true" : (newVal === "false") ? "false" : newVal;
          const normOld = (oldVal === "true") ? "true" : (oldVal === "false") ? "false" : oldVal;

          if (normNew !== normOld) {
            hasChanges = true;
            diffs[f] = { old: normOld, new: normNew };
          }
        });

        if (hasChanges) {
          statsParams.updated++;
          preview.push({
            status: "UPDATE",
            data: { ...entry, _dbId: existing.id, _diff: diffs }
          });
        } else {
          statsParams.same++;
          preview.push({
            status: "SAME",
            data: { ...entry, _dbId: existing.id }
          });
        }
      } else {
        if (!entry.password) {
          statsParams.errors++;
          preview.push({ status: "ERROR", data: { ...entry, _errors: ["Falta Contraseña (para nuevos)"] } });
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

  const handleConfirmImport = async (selectedRows: ImportPreviewRow[]) => {
    setImporting(true);
    let success = 0;
    const errors: string[] = [];

    const rowsToImport = selectedRows.filter(r => r.status === "NEW" || r.status === "UPDATE" || r.status === "SAME");

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
          image: row.image || "" // Use the image from CSV
        };

        let res;
        if ((rowObj.status === "UPDATE" || rowObj.status === "SAME") && row._dbId) {
          // PATCH
          // Remove password if empty from body to avoid overwrite? 
          // Logic: keep simple. If CSV provided password, update it.
          const { password, ...updateBody } = body;
          // Only include password if provided
          const finalBody: any = row.password ? body : updateBody;

          // CRITICAL FIX: Prevent double-hashing.
          // If the CSV contains the hashed password (from export) and it matches the DB,
          // generally we should NOT send it, because the API will hash it again.
          const existingUser = data.find(u => u.id === row._dbId);
          if (existingUser && existingUser.password === row.password) {
            delete finalBody.password;
          }

          // If image is empty in CSV and we are updating, should we wipe it? 
          // Current logic: yes, if CSV says "", then image becomes "".
          // If user wants to keep existing image, they should include it in CSV (which export does).

          res = await fetch(`/api/users/${row._dbId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalBody)
          });
        } else {
          res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
        }

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
    {
      header: "Contraseña",
      accessorKey: "password",
      cell: (val: any) => <span className="block max-w-[100px] truncate text-xs" title={val}>{val}</span>
    },
    { header: "Rol", accessorKey: "role" },
    { header: "Teléfono", accessorKey: "phone" },
    {
      header: "Estado",
      accessorKey: "isActive",
      cell: (val: any) => val ? <span className="text-green-600">Activo</span> : <span className="text-gray-400">Inactivo</span>
    },
    {
      header: "Imagen",
      accessorKey: "image",
      cell: (val: any) => <span className="block max-w-[100px] truncate text-xs" title={val}>{val}</span>
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
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar / Importar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
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
