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

interface DepartmentsActionsProps {
  data: Department[];
}

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

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  // --- Export Logic ---

  const getExportFileName = (ext: string) => {
    return `departamentos_${format(new Date(), "MMMM_yyyy", { locale: es })}.${ext}`;
  };

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
    link.download = getExportFileName("csv");
    link.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    doc.text("Reporte de Departamentos", 14, 10);
    doc.setFontSize(8);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 16);

    const exportData = data.filter(d => !(d as any).isArchived);

    const tableRows = exportData.map(d => [
      d.name,
      d.description || "",
      d.address || "",
      d.maxPeople,
      d.bedCount,
      `$${d.basePrice}`,
      `$${d.cleaningFee || 0}`,
      d.currency || "ARS",
      d.alias || "",
      d.allowPets ? "SI" : "NO",
      d.hasParking ? "SI" : "NO",
      d.wifiName || "",
      d.wifiPass || "",
      d.managerName || "",
      (d as any).keyLocation || "",     // Typed as any if property not on type yet
      (d as any).lockBoxCode || "",
      (d as any).meterLuz || "",
      (d as any).meterGas || "",
      (d as any).meterAgua || "",
      (d as any).ownerName || "",
      (d as any).inventoryNotes || ""
    ]);

    autoTable(doc, {
      startY: 20,
      head: [[
        "Nombre", "Desc.", "Dirección", "Cap.", "Camas",
        "Precio", "Limp.", "Mon.", "Alias",
        "Pet", "Park", "Wifi", "Pass", "Encargado",
        "Llaves", "Locker", "Luz", "Gas", "Agua", "Dueño", "Notas"
      ]],
      body: tableRows,
      styles: { fontSize: 5, cellPadding: 1 }, // Very small font for many columns
      columnStyles: {
        0: { cellWidth: 15 }, // Nombre
        1: { cellWidth: 20 }, // Desc
        2: { cellWidth: 20 }, // Dirección
        20: { cellWidth: 20 } // Notas
      }
    });
    doc.save(getExportFileName("pdf"));
  };

  // --- Import Logic ---

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
    link.download = "plantilla_departamentos.csv";
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
      const dept: any = {};
      const rowErrors: string[] = [];

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
      if (!dept.name) rowErrors.push("Nombre es obligatorio");

      // 3. Validate Duplicate (Global Check)
      const existsActive = data.some(existing =>
        !(existing as any).isArchived &&
        existing.name.trim().toLowerCase() === String(dept.name || "").trim().toLowerCase()
      );
      if (existsActive) {
        rowErrors.push("Ya existe un depto ACTIVO con este nombre");
        dept._duplicate = true;
      }

      return { ...dept, _errors: rowErrors, _id: idx, _valid: rowErrors.length === 0 };
    });

    setCsvData(processed);
  };

  const executeImport = async () => {
    setImporting(true);
    let success = 0;
    const globalErrors: string[] = [];

    // Only import valid and non-duplicate rows (though user usually cleans up csv, here we skip bad ones)
    const validRows = csvData.filter(r => r._valid);

    for (const row of validRows) {
      try {
        const { _errors, _id, _valid, _duplicate, ...payload } = row;

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
        success++;
      } catch (e: any) {
        globalErrors.push(`Error en ${row.name}: ${e.message}`);
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
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF}>
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
            <DialogTitle>Importar Departamentos</DialogTitle>
            <DialogDescription>
              Carga un archivo CSV para importar departamentos masivamente.
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
                Se importaron {successCount} departamentos correctamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Precio</TableHead>
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
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={executeImport} disabled={importing || csvData.filter(r => r._valid).length === 0}>
              {importing ? "Importando..." : `Importar ${csvData.filter(r => r._valid).length} deptos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
