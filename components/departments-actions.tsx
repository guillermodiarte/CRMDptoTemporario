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
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Department } from "@prisma/client";

interface DepartmentsActionsProps {
  data: Department[];
}

export function DepartmentsActions({ data }: DepartmentsActionsProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  // --- Export Logic ---

  const exportToCSV = () => {
    const csvRows = [];
    // Headers (Expanded)
    const headers = [
      "Nombre", "Dirección", "Alias", "Color", "Activo",
      "Capacidad (Pers)", "Camas", "Precio Base", "Limpieza",
      "WiFi Nombre", "WiFi Pass",
      "Ubicación Llaves", "Cód. Locker",
      "Dueño",
      "Google Maps", "Airbnb", "Booking",
      "Medidor Luz", "Medidor Gas", "Medidor Agua", "Medidor WiFi",
      "Notas Inventario"
    ];
    csvRows.push(headers.join(","));

    // Body
    data.forEach(dept => {
      const d = dept as any;
      const safeStr = (val: any) => `"${(val || "").toString().replace(/"/g, '""')}"`;

      const row = [
        safeStr(d.name),
        safeStr(d.address),
        safeStr(d.alias),
        safeStr(d.color),
        d.isActive ? "Si" : "No",
        d.maxPeople || 0,
        d.bedCount || 0,
        d.basePrice || 0,
        d.cleaningFee || 0,
        safeStr(d.wifiName),
        safeStr(d.wifiPass),
        safeStr(d.keyLocation),
        safeStr(d.lockBoxCode),
        safeStr(d.ownerName),
        safeStr(d.googleMapsLink),
        safeStr(d.airbnbLink),
        safeStr(d.bookingLink),
        safeStr(d.meterLuz),
        safeStr(d.meterGas),
        safeStr(d.meterAgua),
        safeStr(d.meterWifi),
        safeStr(d.inventoryNotes)
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `departamentos_full_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Departamentos", 14, 10);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 16);

    const tableColumn = ["Nombre", "Dirección", "WiFi", "Cap.", "Precio", "Cód. Locker", "Activo"];
    const tableRows: any[] = [];

    data.forEach(dept => {
      const row = [
        dept.name.substring(0, 20),
        (dept.address || "").substring(0, 20),
        (dept.wifiName || "").substring(0, 15),
        `${dept.maxPeople}p`,
        `$${dept.basePrice}`,
        ((dept as any).lockBoxCode || "-"),
        dept.isActive ? "Si" : "No"
      ];
      tableRows.push(row);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
    });

    const fileName = `departamentos_resumen_${format(new Date(), "yyyy-MM-dd")}.pdf`;
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
          // Normalize keys loosely
          Object.keys(row).forEach(key => {
            const k = key.trim().toLowerCase().replace(/\s+/g, ""); // remove spaces
            const val = row[key]?.trim();

            if (k.includes("nombre") && !k.includes("wifi")) newRow["name"] = val; // avoid matching WiFi Nombre
            else if (k === "direccion" || k === "dirección" || k === "address") newRow["address"] = val;
            else if (k === "alias") newRow["alias"] = val;
            else if (k === "color") newRow["color"] = val;

            else if (k === "capacidad" || k.includes("maxpeople") || k.includes("cap.")) newRow["maxPeople"] = val;
            else if (k === "camas" || k.includes("bed")) newRow["bedCount"] = val;

            else if (k === "preciobase" || k === "baseprice") newRow["basePrice"] = val;
            else if (k === "limpieza" || k === "cleaningfee") newRow["cleaningFee"] = val;

            else if (k === "wifinombre" || k === "wifiname") newRow["wifiName"] = val;
            else if (k === "wifipass" || k === "wifipassword") newRow["wifiPass"] = val;

            else if (k.includes("ubicacion") || k.includes("keylocation")) newRow["keyLocation"] = val;
            else if (k.includes("locker") || k.includes("lockbox")) newRow["lockBoxCode"] = val;
            else if (k.includes("dueño") || k.includes("owner")) newRow["ownerName"] = val;

            else if (k.includes("google") || k.includes("maps")) newRow["googleMapsLink"] = val;
            else if (k.includes("airbnb")) newRow["airbnbLink"] = val;
            else if (k.includes("booking")) newRow["bookingLink"] = val;

            else if (k.includes("medidorluz")) newRow["meterLuz"] = val;
            else if (k.includes("medidorgas")) newRow["meterGas"] = val;
            else if (k.includes("medidoragua")) newRow["meterAgua"] = val;
            else if (k.includes("medidorwifi")) newRow["meterWifi"] = val;

            else if (k.includes("inventario")) newRow["inventoryNotes"] = val;
            else if (k === "activo" || k === "isactive") newRow["isActive"] = val;
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

      if (!row.name) issues.push("Falta Nombre");

      // Parse numbers
      if (row.maxPeople) {
        const num = parseInt(row.maxPeople);
        if (isNaN(num) || num < 1) issues.push("Capacidad inválida");
      }
      if (row.basePrice) {
        const num = parseFloat(row.basePrice);
        if (isNaN(num) || num < 0) issues.push("Precio inválido");
      }

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
          // Standard
          name: row.name,
          address: row.address,
          alias: row.alias,
          maxPeople: parseInt(row.maxPeople || "1"),
          bedCount: parseInt(row.bedCount || "1"),
          basePrice: parseFloat(row.basePrice || "0"),
          cleaningFee: parseFloat(row.cleaningFee || "0"),
          color: row.color || "#3b82f6",
          isActive: row.isActive === "Si" || row.isActive === "true" || row.isActive === "1" || row.isActive === true || !row.isActive, // Default true if processing a fresh import

          // Technical
          wifiName: row.wifiName,
          wifiPass: row.wifiPass,

          // Operations
          keyLocation: row.keyLocation,
          lockBoxCode: row.lockBoxCode,
          ownerName: row.ownerName,

          // Details
          meterLuz: row.meterLuz,
          meterGas: row.meterGas,
          meterAgua: row.meterAgua,
          meterWifi: row.meterWifi,
          inventoryNotes: row.inventoryNotes,

          // Links
          googleMapsLink: row.googleMapsLink,
          airbnbLink: row.airbnbLink,
          bookingLink: row.bookingLink
        };

        const res = await fetch("/api/departments", {
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
        errors.push(`Error importando ${row.name}: ${e.message}`);
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
    const headers = [
      "Nombre", "Dirección", "Alias", "Color", "Activo",
      "Capacidad (Pers)", "Camas", "Precio Base", "Limpieza",
      "WiFi Nombre", "WiFi Pass",
      "Ubicación Llaves", "Cód. Locker",
      "Dueño",
      "Google Maps", "Airbnb", "Booking",
      "Medidor Luz", "Medidor Gas", "Medidor Agua", "Medidor WiFi",
      "Notas Inventario"
    ];
    // Example row
    const example = [
      "Depto Ejemplo", "Av. Libertador 123", "LIB-1", "#FF5733", "Si",
      "4", "3", "50000", "15000",
      "Wifi-Guest", "Pass123",
      "Portería", "1234",
      "Juan Perez",
      "https://maps.google.com/...", "https://airbnb.com/...", "https://booking.com/...",
      "112233", "445566", "778899", "101010",
      "Toallas en cajón superior"
    ];

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), example.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_departamentos.csv");
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
            <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV (Completo)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" /> PDF (Resumen)
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
            <DialogTitle>Importar Departamentos</DialogTitle>
            <DialogDescription>
              Carga un archivo CSV para crear departamentos. El archivo admite todas las columnas nuevas (Medidores, Links, Inventario).
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
                  <TableHead>Estado</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Capacidad</TableHead>
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
                  <TableRow key={i} className={row._valid ? "bg-white" : "bg-red-50"}>
                    <TableCell>
                      {row._valid ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                        <AlertCircle className="h-4 w-4 text-red-500" />}
                    </TableCell>
                    <TableCell>
                      {row.name}
                      {row._error && <div className="text-xs text-red-600 font-medium">{row._error}</div>}
                    </TableCell>
                    <TableCell>{row.address}</TableCell>
                    <TableCell>{row.maxPeople}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={processImport} disabled={importing || csvData.filter(r => r._valid).length === 0}>
              {importing ? "Importando..." : `Importar ${csvData.filter(r => r._valid).length} Deptos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
