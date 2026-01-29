"use client";

import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";

export type ImportStatus = "NEW" | "UPDATE" | "SAME" | "ERROR";

export interface ImportPreviewRow {
  status: ImportStatus;
  statusLabel?: string; // Optional override
  data: any; // The raw data object
}

export interface ImportPreviewColumn {
  header: string;
  accessorKey: string; // Key in data object
  cell?: (value: any, row: ImportPreviewRow) => React.ReactNode; // Custom renderer
}

export interface ImportStats {
  total: number;
  new: number;
  updated: number;
  same: number;
  errors?: number;
}

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedRows: ImportPreviewRow[]) => void;
  isImporting: boolean;
  title?: string;
  rows: ImportPreviewRow[];
  columns: ImportPreviewColumn[];
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
        // Default select NEW and UPDATE. ERROR cannot be selected? Assuming we skip errors.
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

    // If all valid are selected, deselect all. Otherwise select all.
    const allSelected = validIndices.every(i => selectedIndices.has(i));

    if (allSelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(validIndices));
    }
  };

  // Calculate stats based on selection
  const selectedCount = selectedIndices.size;
  // Determine if "All" checkbox should be checked
  const validRowsCount = rows.filter(r => r.status === "NEW" || r.status === "UPDATE").length;
  const isAllSelected = validRowsCount > 0 && selectedIndices.size === validRowsCount;
  const isIndeterminate = selectedIndices.size > 0 && selectedIndices.size < validRowsCount;

  const handleConfirm = () => {
    const selected = rows.filter((_, idx) => selectedIndices.has(idx));
    onConfirm(selected);
  };

  const getStatusBadge = (status: ImportStatus) => {
    switch (status) {
      case "NEW":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">NUEVO</Badge>;
      case "UPDATE":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">ACTUALIZAR</Badge>;
      case "SAME":
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">IGUAL</Badge>;
      case "ERROR":
        return <Badge variant="destructive">ERROR</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-full max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Revisa los cambios detectados antes de confirmar la actualización.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/50">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 p-6 pb-2">
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TOTAL</span>
                <span className="text-3xl font-bold mt-1">{stats.total}</span>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-blue-500">
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">NUEVOS</span>
                <span className="text-3xl font-bold mt-1 text-blue-700">{stats.new}</span>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-orange-500">
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">ACTUALIZAR</span>
                <span className="text-3xl font-bold mt-1 text-orange-700">{stats.updated}</span>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-gray-400">
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">SIN CAMBIOS</span>
                <span className="text-3xl font-bold mt-1 text-gray-600">{stats.same}</span>
              </CardContent>
            </Card>
          </div>

          {/* Table Area */}
          <div className="flex-1 px-6 py-4 min-h-0 flex flex-col">
            <div className="border rounded-md bg-white shadow-sm flex-1 overflow-auto">
              <Table>
                <TableHeader className="bg-gray-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[40px] p-2 text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleAll}
                      // indeterminate={isIndeterminate} // Checkbox component might not support indeterminate prop directly if standard shadcn
                      />
                    </TableHead>
                    <TableHead className="w-[80px] text-xs h-8">Estado</TableHead>
                    {columns.map((col) => (
                      <TableHead key={col.accessorKey} className="text-xs h-8 whitespace-nowrap">{col.header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx} className={row.status === "SAME" ? "opacity-60 bg-gray-50/30" : ""}>
                      <TableCell className="w-[40px] p-2 text-center">
                        {(row.status === "NEW" || row.status === "UPDATE") && (
                          <Checkbox
                            checked={selectedIndices.has(idx)}
                            onCheckedChange={() => toggleRow(idx)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="p-2 py-1">{getStatusBadge(row.status)}</TableCell>
                      {columns.map((col) => {
                        const diff = row.data._diff?.[col.accessorKey];
                        const cellContent = col.cell ? col.cell(row.data[col.accessorKey], row) : row.data[col.accessorKey];

                        if (diff) {
                          return (
                            <TableCell key={col.accessorKey} className="p-2 py-1 text-xs whitespace-nowrap bg-yellow-50 relative">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help font-medium text-orange-700 underline decoration-dotted underline-offset-2">
                                      {cellContent}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
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
                          <TableCell key={col.accessorKey} className="p-2 py-1 text-xs whitespace-nowrap">
                            {cellContent}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                        No hay datos para mostrar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-white">
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isImporting || selectedCount === 0}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isImporting ? "Importando..." : `Confirmar Importación (${selectedCount} seleccionados)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
