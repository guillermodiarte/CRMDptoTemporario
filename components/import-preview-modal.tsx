"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

export type ImportStatus = "NEW" | "UPDATE" | "SAME" | "ERROR";

export interface ImportPreviewRow<T = any> {
  data: T;
  status: ImportStatus;
  errors?: string[];
}

export interface ImportStats {
  total: number;
  new: number;
  updated: number;
  same: number;
  errors: number;
}

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedRows: ImportPreviewRow[]) => void;
  isImporting?: boolean;
  title?: string;
  rows: ImportPreviewRow[];
  columns: {
    header: string;
    accessorKey: string;
    cell?: (value: any, row: ImportPreviewRow) => React.ReactNode;
  }[];
  stats: ImportStats;
}

export function ImportPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  isImporting,
  title = "Vista Previa de Importación",
  rows,
  columns,
  stats
}: ImportPreviewModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Initialize selection when rows change
  useEffect(() => {
    if (isOpen && rows.length > 0) {
      const initialSelection = new Set<number>();
      rows.forEach((row, idx) => {
        if (row.status === "NEW" || row.status === "UPDATE") {
          initialSelection.add(idx);
        }
      });
      setSelectedIndices(initialSelection);
    }
  }, [rows, isOpen]);

  const toggleRow = (idx: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedIndices(newSet);
  };

  const toggleAll = () => {
    const validIndices = rows
      .map((r, i) => (r.status === "NEW" || r.status === "UPDATE") ? i : -1)
      .filter(i => i !== -1);

    const allSelected = validIndices.every(i => selectedIndices.has(i));

    if (allSelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(validIndices));
    }
  };

  const selectedCount = selectedIndices.size;
  const validRowsCount = rows.filter(r => r.status === "NEW" || r.status === "UPDATE").length;
  const isAllSelected = validRowsCount > 0 && selectedIndices.size === validRowsCount;

  const handleConfirm = () => {
    const selected = rows.filter((_, idx) => selectedIndices.has(idx));
    onConfirm(selected);
  };

  const getStatusBadge = (status: ImportStatus) => {
    switch (status) {
      case "NEW":
        return (
          <Badge variant="outline" className="bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30 font-bold text-[11px] px-2 py-0.5">
            NUEVO
          </Badge>
        );
      case "UPDATE":
        return (
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 font-bold text-[11px] px-2 py-0.5">
            ACTUALIZAR
          </Badge>
        );
      case "SAME":
        return (
          <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-medium text-[11px] px-2 py-0.5">
            IGUAL
          </Badge>
        );
      case "ERROR":
        return (
          <Badge variant="destructive" className="font-bold text-[11px] px-2 py-0.5">
            ERROR
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-4xl w-full max-h-[95vh] flex flex-col p-0 gap-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">{title}</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Revisa los cambios detectados antes de confirmar la actualización.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/70 dark:bg-slate-950/60">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-5 sm:p-6 pb-2">
            <Card className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">TOTAL</span>
                <span className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 dark:text-white">{stats.total}</span>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 border-t-4 border-t-sky-500 shadow-xs">
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">NUEVOS</span>
                <span className="text-2xl sm:text-3xl font-extrabold mt-1 text-sky-600 dark:text-sky-400">{stats.new}</span>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 border-t-4 border-t-amber-500 shadow-xs">
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">ACTUALIZAR</span>
                <span className="text-2xl sm:text-3xl font-extrabold mt-1 text-amber-600 dark:text-amber-400">{stats.updated}</span>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 border-t-4 border-t-slate-400 dark:border-t-slate-600 shadow-xs">
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SIN CAMBIOS</span>
                <span className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-600 dark:text-slate-300">{stats.same}</span>
              </CardContent>
            </Card>
          </div>

          {/* Table Area */}
          <div className="flex-1 px-5 sm:px-6 py-4 min-h-0 flex flex-col">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs flex-1 overflow-auto">
              <Table>
                <TableHeader className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                    <TableHead className="w-[40px] p-2 text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="w-[100px] text-xs h-9 font-bold text-slate-700 dark:text-slate-200">Estado</TableHead>
                    {columns.map((col) => (
                      <TableHead key={col.accessorKey} className="text-xs h-9 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{col.header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow 
                      key={idx} 
                      className={`border-b border-slate-100 dark:border-slate-800/80 transition-colors ${
                        row.status === "SAME" 
                          ? "opacity-60 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <TableCell className="w-[40px] p-2 text-center">
                        {(row.status === "NEW" || row.status === "UPDATE" || row.status === "SAME") && (
                          <Checkbox
                            checked={selectedIndices.has(idx)}
                            onCheckedChange={() => toggleRow(idx)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="p-2 py-1.5">{getStatusBadge(row.status)}</TableCell>
                      {columns.map((col) => {
                        const diff = row.data._diff?.[col.accessorKey];
                        const cellContent = col.cell ? col.cell(row.data[col.accessorKey], row) : row.data[col.accessorKey];

                        if (diff) {
                          return (
                            <TableCell key={col.accessorKey} className="p-2 py-1.5 text-xs whitespace-nowrap bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 relative">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help font-semibold text-amber-700 dark:text-amber-400 underline decoration-dotted underline-offset-2">
                                      {cellContent}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 dark:bg-slate-800 text-white border border-slate-700">
                                    <p className="text-xs">
                                      <span className="font-semibold">Anterior:</span> {String(diff.old)}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell key={col.accessorKey} className="p-2 py-1.5 text-xs whitespace-nowrap text-slate-800 dark:text-slate-200">
                            {cellContent}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length + 2} className="h-24 text-center text-slate-400 dark:text-slate-500">
                        No hay datos para mostrar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={isImporting} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isImporting || selectedCount === 0} className="bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer shadow-xs">
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isImporting ? "Importando..." : `Confirmar Importación (${selectedCount} seleccionados)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
