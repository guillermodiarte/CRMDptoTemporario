"use client";

import { useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle, FileDown } from "lucide-react";
import { Department, Expense, ExpenseType } from "@prisma/client";
import { format, isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

interface FinanceActionsProps {
  expenses: (Expense & { department: { name: string } | null })[];
  departments: Department[];
  date?: Date;
}

const TYPE_LABELS: Record<string, string> = {
  SUPPLY: "Insumos y Mantenimiento",
  TAX: "Impuestos y Servicios",
  COMMISSION: "Comisión",
};

const REVERSE_TYPE_LABELS: Record<string, ExpenseType> = {
  "insumos": "SUPPLY",
  "insumos y mantenimiento": "SUPPLY",
  "mantenimiento": "SUPPLY",
  "impuestos": "TAX",
  "impuestos y servicios": "TAX",
  "servicios": "TAX",
  "comisión": "COMMISSION",
  "comision": "COMMISSION",
  "comisiones": "COMMISSION"
};

export function FinanceActions({ expenses, departments, date = new Date() }: FinanceActionsProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  // --- Export Logic ---

  const getExportFileName = (ext: string) => {
    return `finanzas_gastos_${format(date, "MMMM_yyyy", { locale: es })}.${ext}`;
  };

  const exportToCSV = () => {
    const csvRows = [];
    csvRows.push([
      "Fecha", "Tipo", "Descripción", "Departamento", "Total", "Cantidad", "Precio Unitario"
    ].join(","));

    expenses.forEach(exp => {
      const row = [
        format(new Date(exp.date), "yyyy-MM-dd"),
        `"${TYPE_LABELS[exp.type] || exp.type}"`,
        `"${exp.description.replace(/"/g, '""')}"`,
        `"${(exp.department?.name || "Global").replace(/"/g, '""')}"`,
        exp.amount,
        exp.quantity || 1,
        exp.unitPrice || 0
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", getExportFileName("csv"));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Finanzas", 14, 10);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 16);
    doc.text(`Período: ${format(date, "MMMM yyyy", { locale: es })}`, 14, 21);

    const tableColumn = ["Fecha", "Tipo", "Desc.", "Depto", "Total"];
    const tableRows: any[] = [];

    expenses.forEach(exp => {
      const row = [
        format(new Date(exp.date), "dd/MM"),
        TYPE_LABELS[exp.type]?.substring(0, 15) || exp.type,
        exp.description.substring(0, 20),
        exp.department?.name.substring(0, 10) || "Global",
        `$${exp.amount}`
      ];
      tableRows.push(row);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8 },
    });

    doc.save(getExportFileName("pdf"));
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
      delimiter: "", // Auto-detect
      complete: (results) => {
        const normalizedData = results.data.map((row: any) => {
          const newRow: any = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.trim().toLowerCase();
            if (normalizedKey === "fecha" || normalizedKey === "date") newRow["Date"] = row[key];
            else if (normalizedKey === "tipo" || normalizedKey === "type") newRow["Type"] = row[key];
            else if (normalizedKey === "descripción" || normalizedKey === "descripcion" || normalizedKey === "description") newRow["Description"] = row[key];
            else if (normalizedKey === "departamento" || normalizedKey === "department" || normalizedKey === "depto") newRow["DepartmentName"] = row[key];
            else if (normalizedKey === "total" || normalizedKey === "amount" || normalizedKey === "monto") newRow["Amount"] = row[key];
            else if (normalizedKey === "cantidad" || normalizedKey === "quantity") newRow["Quantity"] = row[key];
            else if (normalizedKey === "precio unitario" || normalizedKey === "unitprice") newRow["UnitPrice"] = row[key];
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
      if (!row.Date) issues.push("Falta Fecha");
      if (!row.Type) issues.push("Falta Tipo (Insumos, Impuestos, Comisión)");
      if (!row.Description) issues.push("Falta Descripción");
      if (!row.Amount) issues.push("Falta Total");

      // Validate Type
      const typeKey = row.Type?.toString().trim().toLowerCase();
      const mappedType = REVERSE_TYPE_LABELS[typeKey];
      if (!mappedType && !Object.values(ExpenseType).includes(row.Type)) {
        issues.push(`Tipo inválido: ${row.Type}`);
      } else {
        row._mappedType = mappedType || row.Type;
      }

      // Validate Date
      if (row.Date && !isValid(parse(row.Date, "yyyy-MM-dd", new Date()))) {
        issues.push("Fecha inválida (YYYY-MM-DD)");
      }

      // Validate Department (Optional)
      if (row.DepartmentName && row.DepartmentName !== "Global") {
        const dept = departments.find(d => d.name.toLowerCase() === row.DepartmentName.toLowerCase());
        if (!dept) issues.push(`Departamento no encontrado: ${row.DepartmentName}`);
        else row._departmentId = dept.id;
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
          type: row._mappedType,
          description: row.Description,
          amount: parseFloat(row.Amount),
          departmentId: row._departmentId,
          date: row.Date,
          quantity: row.Quantity ? parseInt(row.Quantity) : 1,
          unitPrice: row.UnitPrice ? parseFloat(row.UnitPrice) : undefined
        };

        const res = await fetch("/api/expenses", {
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
        errors.push(`Error importando ${row.Description}: ${e.message}`);
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
    const headers = ["Fecha", "Tipo", "Descripción", "Departamento", "Total", "Cantidad", "Precio Unitario"];
    const example = ["2024-01-30", "Insumos", "Compra de papel", "Depto 1", "5000", "2", "2500"];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), example.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_finanzas.csv");
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
            <DialogTitle>Importar Gastos</DialogTitle>
            <DialogDescription>
              Carga un archivo CSV para importar gastos masivamente.
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
                Se importaron {successCount} gastos correctamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Desc.</TableHead>
                  <TableHead>Total</TableHead>
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
                  <TableRow key={i} className={row._valid ? "bg-white" : "bg-red-50"}>
                    <TableCell>
                      {row._valid ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                    </TableCell>
                    <TableCell>{row.Date}</TableCell>
                    <TableCell>
                      {row.Type}
                      {row._mappedType && row._mappedType !== row.Type && <span className="text-xs text-muted-foreground ml-1">({row._mappedType})</span>}
                    </TableCell>
                    <TableCell>
                      {row.Description}
                      {row._error && <div className="text-xs text-red-600 font-medium">{row._error}</div>}
                    </TableCell>
                    <TableCell>{row.Amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={processImport} disabled={importing || csvData.filter(r => r._valid).length === 0}>
              {importing ? "Importando..." : `Importar ${csvData.filter(r => r._valid).length} Gastos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
