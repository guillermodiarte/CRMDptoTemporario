"use client";

import { useState } from "react";
import { Department, Reservation } from "@prisma/client";
import { Plus, Pencil, Trash, NotepadText, Link as LinkIcon, Search, Car } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReservationForm } from "@/components/reservation-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

type ReservationWithDept = Reservation & { department: Department };

interface ReservationsClientProps {
  data: ReservationWithDept[];
  departments: Department[];
  dollarRate: number;
  role?: string;
  blacklistedPhones?: string[];
  hideMonthSelector?: boolean;
  blacklistEntries?: { guestPhone: string; reason: string; guestName: string }[];
  startYear?: number;
  endYear?: number;
}

import { MonthSelector } from "./month-selector";
import { Check, DollarSign, ShieldAlert, Ban, UserX } from "lucide-react";
import { ReservationsActions } from "./reservations-actions";
import { BlacklistForm } from "./blacklist-form";
import { normalizePhone } from "@/lib/phone-utils";
import { formatCurrency } from "@/lib/utils";



export const ReservationsClient: React.FC<ReservationsClientProps> = ({
  data,
  departments,
  dollarRate,
  role,
  blacklistedPhones = [],
  hideMonthSelector = false,
  blacklistEntries = [],
  startYear = new Date().getFullYear(),
  endYear = new Date().getFullYear() + 10
}) => {
  const [open, setOpen] = useState(false);
  const [editingRes, setEditingRes] = useState<ReservationWithDept | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVisualizer = role === 'VISUALIZER';
  const isAdmin = role === 'ADMIN';

  // Derive selected date from URL or default to today
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const now = new Date();
  const selectedYear = yearParam ? parseInt(yearParam) : now.getFullYear();
  // Month is 0-indexed in JS Date, but usually 1-indexed in URL (check MonthSelector implementation)
  // Assuming MonthSelector uses 0-indexed or 1-indexed?
  // Standard practice often 1-indexed for URLs. Let's assume 0-indexed based on "month=1" usually meaning Feb in JS terms but "month=1" usually means Jan in human terms.
  // Actually, checking previous logs: "GET /dashboard/reservations?month=1". 
  // If MonthSelector is standard, it might be 0-indexed if it's strictly JS based, or 1 for Jan.
  // Let's assume 0-indexed for now to match `new Date().getMonth()`.
  // Wait, if I see ?month=1 in logs and it's January... then it's 1-based? Or 0-based and it's Feb?
  // Let's check `MonthSelector` if possible, or just default to `new Date(selectedYear, monthParam ? parseInt(monthParam) : now.getMonth(), 1)`.
  // Safest is to construct a date.
  const selectedMonth = monthParam ? parseInt(monthParam) : now.getMonth();
  const selectedDate = new Date(selectedYear, selectedMonth, 1);

  const handleEdit = (res: ReservationWithDept) => {
    setEditingRes(res);
    setOpen(true);
  };

  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [payConfirmationData, setPayConfirmationData] = useState<{ id: string, total: number } | null>(null);
  const [reportBlacklistData, setReportBlacklistData] = useState<ReservationWithDept | null>(null);
  const [noShowConfirmationId, setNoShowConfirmationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmationId(id);
  };

  const handleNoShowClick = (id: string) => {
    setNoShowConfirmationId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmationId) return;
    try {
      await fetch(`/api/reservations/${deleteConfirmationId}`, { method: 'DELETE' });
      router.refresh();
    } catch (e) {
      console.error("Error deleting", e);
    } finally {
      setDeleteConfirmationId(null);
    }
  };

  const confirmNoShow = async () => {
    if (!noShowConfirmationId) return;
    try {
      await fetch(`/api/reservations/${noShowConfirmationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'NO_SHOW' })
      });
      router.refresh();
    } catch (e) {
      console.error("Error setting no-show", e);
    } finally {
      setNoShowConfirmationId(null);
    }
  };

  const handleMarkPaidClick = (id: string, total: number) => {
    setPayConfirmationData({ id, total });
  }

  const confirmMarkPaid = async () => {
    if (!payConfirmationData) return;
    try {
      await fetch(`/api/reservations/${payConfirmationData.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus: 'PAID', depositAmount: payConfirmationData.total })
      });
      router.refresh();
    } catch (e) {
      console.error("Error updating", e);
    } finally {
      setPayConfirmationData(null);
    }
  }

  const handleCreate = () => {
    setEditingRes(null);
    setOpen(true);
  }

  // Calculate "Next Upcoming"
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedData = [...data]
    .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
    .filter(res =>
      (res.guestName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (res.guestPhone || "").includes(search)
    );

  // Logic: Find first reservation starting TODAY or LATER.
  // "Strictly Date-Based... 1. Reserva del día de hoy... 2. Próxima reserva futura"
  // Past start dates are excluded.
  const nextReservation = sortedData.find(r => {
    const checkInDate = new Date(r.checkIn);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate >= today;
  });

  return (
    <>
      {!isVisualizer ? (
        <Dialog open={open} onOpenChange={(val) => {
          setOpen(val);
          if (!val) setEditingRes(null);
        }}>
          <div className="flex flex-col gap-4 mb-6">
            {/* Top Row: Title (Desktop: Title + MonthSelector) */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
                <h2 className="text-3xl font-bold tracking-tight">Reservas</h2>

                {/* Mobile Row: Month Selector + Export Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                  {!hideMonthSelector && <MonthSelector startYear={startYear} endYear={endYear} />}

                  {/* Export/Import (Mobile Only) */}
                  <div className="md:hidden">
                    <ReservationsActions
                      data={data}
                      departments={departments}
                      blacklistedPhones={blacklistedPhones}
                      blacklistEntries={blacklistEntries}
                      date={selectedDate}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Row: Search + New Button (Desktop: Search + Actions + New) */}
              <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                <div className="flex gap-2 w-full md:w-auto items-center">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Buscar reserva..."
                      className="pl-9 w-full"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* New Button (Mobile Only) */}
                  <DialogTrigger asChild>
                    <Button onClick={handleCreate} className="md:hidden whitespace-nowrap w-[140px] h-10 text-base">
                      <Plus className="mr-2 h-5 w-5" /> Nueva
                    </Button>
                  </DialogTrigger>

                  {/* Desktop Actions */}
                  <div className="hidden md:flex gap-2 items-center">
                    <ReservationsActions
                      data={data}
                      departments={departments}
                      blacklistedPhones={blacklistedPhones}
                      blacklistEntries={blacklistEntries}
                      date={selectedDate}
                    />

                    <DialogTrigger asChild>
                      <Button onClick={handleCreate} className="whitespace-nowrap">
                        <Plus className="mr-2 h-4 w-4" /> Nueva
                      </Button>
                    </DialogTrigger>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-md" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{editingRes ? "Editar Reserva" : "Nueva Reserva"}</DialogTitle>
            </DialogHeader>
            <ReservationForm
              departments={departments}
              setOpen={setOpen}
              initialData={editingRes}
            />
          </DialogContent>
        </Dialog>
      ) : (
        // Visualizer View (Simplified, existing structure mostly)
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Reservas</h2>
            {!hideMonthSelector && <MonthSelector startYear={startYear} endYear={endYear} />}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64 md:mr-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar reserva..."
                className="pl-9 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Listado de Reservas</h3>
          <p className="text-sm text-muted-foreground">Gestiona tus reservas y ocupación.</p>
        </div>

        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
            <span>Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
            <span>Pagado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
            <span>No Presentado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 border border-red-500 rounded"></div>
            <span>Lista Negra</span>
          </div>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Huésped</TableHead>
                <TableHead>Depto</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead>Noches</TableHead>
                <TableHead>Personas</TableHead>
                <TableHead className="text-center">Cochera</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Gastos (Limp+Ins)</TableHead>
                <TableHead className="text-right">Deuda</TableHead>
                {!isVisualizer && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedData.map((res) => {
                const isPaid = res.paymentStatus === 'PAID';
                const isPartial = res.paymentStatus === 'PARTIAL';
                const isNext = nextReservation?.id === res.id;
                const isNoShow = (res.status as any) === 'NO_SHOW';

                const normalizedGuestPhone = res.guestPhone ? normalizePhone(res.guestPhone) : '';
                const isBlacklisted = blacklistedPhones.includes(normalizedGuestPhone);

                let rowClass = "";
                if (isNoShow) {
                  rowClass = "bg-orange-50 hover:bg-orange-100 text-muted-foreground";
                } else if (isBlacklisted) {
                  rowClass = "bg-red-50 hover:bg-red-100 border-l-4 border-red-500";
                } else if (isPaid) {
                  rowClass = "bg-green-50 hover:bg-green-100";
                }

                if (isNext) {
                  rowClass += " border-2 border-blue-500";
                }

                const debt = res.totalAmount - (res.depositAmount || 0);
                const canMarkNoShow = isAdmin && !isNoShow && today > new Date(res.checkIn) && !isPaid;

                return (
                  <TableRow key={res.id} className={rowClass}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {/* Icono Izquierda */}
                        <div className="shrink-0 flex items-center justify-center w-8">
                          {res.source === 'AIRBNB' && <img src="/icons/airbnb.png" alt="Airbnb" className="h-8 w-8 object-contain" title="Airbnb" />}
                          {res.source === 'BOOKING' && <img src="/icons/booking.png" alt="Booking" className="h-8 w-8 object-contain" title="Booking" />}
                          {res.source === 'DIRECT' && <img src="/icons/direct.png" alt="Directo" className="h-8 w-8 object-contain" title="Directo" />}
                          {!['AIRBNB', 'BOOKING', 'DIRECT'].includes(res.source || '') && <span className="text-xs text-muted-foreground font-bold">{res.source?.substring(0, 3)}</span>}
                        </div>

                        {/* Info Derecha */}
                        <div className="flex flex-col">
                          <div className={isNoShow ? "line-through" : ""}>{res.guestName}</div>
                          <div className="text-xs text-muted-foreground">{res.guestPhone}</div>
                          <div className="text-xs text-muted-foreground font-semibold">{res.source === 'DIRECT' ? 'DIRECTO' : res.source}</div>
                          {isBlacklisted && <Badge variant="destructive" className="mt-1 text-[10px] w-fit">Lista Negra</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {res.department.name}
                    </TableCell>
                    <TableCell>
                      {format(new Date(res.checkIn), "dd/MM")} - {format(new Date(res.checkOut), "dd/MM")}
                      {res.groupId && (
                        <span title="Parte de una reserva dividida" className="ml-2 inline-block">
                          <LinkIcon className="h-3 w-3 text-blue-500" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {Math.max(1, Math.ceil((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / (1000 * 60 * 60 * 24)))}
                    </TableCell>
                    <TableCell>
                      {res.guestPeopleCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {res.hasParking ? <Car className="h-5 w-5 mx-auto text-blue-600" /> : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isNoShow ? "secondary" : "outline"}>
                        {isNoShow ? "NO PRESENTADO" : res.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isPaid ? 'default' : isPartial ? 'secondary' : 'destructive'}>
                        {isPaid ? 'PAGADO' : isPartial ? 'PARCIAL' : 'PENDIENTE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={isNoShow ? "line-through text-muted-foreground" : ""}>
                          {res.currency === 'USD' ? `US$ ${res.totalAmount}` : formatCurrency(res.totalAmount)}
                        </span>
                        {res.currency === 'USD' && !isNoShow && (
                          <span className="text-xs text-muted-foreground">≈ {formatCurrency(Math.round(res.totalAmount * dollarRate))}</span>
                        )}
                        {isNoShow && (
                          <span className="text-xs text-orange-600 font-semibold">Seña: {formatCurrency(res.depositAmount || 0)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-muted-foreground">
                          {res.cleaningFee ? formatCurrency(res.cleaningFee) : '-'}
                        </span>
                        {(res.amenitiesFee || 0) > 0 && (
                          <span className="text-xs text-red-600" title="Insumos (Informativo)">
                            +{formatCurrency(res.amenitiesFee || 0)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {!isPaid && !isNoShow ? (res.currency === 'USD' ? `US$ ${debt}` : formatCurrency(debt)) : '-'}
                    </TableCell>
                    {!isVisualizer && (
                      <TableCell className="text-right flex justify-end gap-1">
                        {res.notes && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" title="Ver notas">
                                <NotepadText className="h-4 w-4 text-blue-500" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4 bg-white border rounded shadow-lg z-50">
                              <div className="space-y-2">
                                <h4 className="font-semibold leading-none mb-1">Nota de Reserva</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {res.notes}
                                </p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        {!isPaid && !isNoShow && (
                          <Button variant="ghost" size="icon" title="Marcar Pagado" className="text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => handleMarkPaidClick(res.id, res.totalAmount)}>
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        {canMarkNoShow && (
                          <Button variant="ghost" size="icon" title="Marcar No Presentado" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50" onClick={() => handleNoShowClick(res.id)}>
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                        {isBlacklisted ? (
                          <Button variant="ghost" size="icon" title="Huésped ya en lista negra" className="text-red-500 cursor-not-allowed opacity-70" disabled>
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" title="Reportar a Lista Negra" className="text-orange-500 hover:text-orange-600" onClick={() => setReportBlacklistData(res)}>
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(res)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteClick(res.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {sortedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={!isVisualizer ? 11 : 10} className="text-center h-24">
                    No se encontraron reservas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View (Compact & Wrapped) */}
        <div className="md:hidden space-y-3">
          {sortedData.map((res) => {
            const isPaid = res.paymentStatus === 'PAID';
            const isPartial = res.paymentStatus === 'PARTIAL';
            const isNext = nextReservation?.id === res.id;
            const isNoShow = (res.status as any) === 'NO_SHOW';
            const normalizedGuestPhone = res.guestPhone ? normalizePhone(res.guestPhone) : '';
            const isBlacklisted = blacklistedPhones.includes(normalizedGuestPhone);
            const debt = res.totalAmount - (res.depositAmount || 0);
            const canMarkNoShow = isAdmin && !isNoShow && today > new Date(res.checkIn) && !isPaid;

            let cardClass = "text-sm";
            if (isNoShow) {
              cardClass += " bg-orange-50 opacity-90";
            } else if (isBlacklisted) {
              cardClass += " bg-red-50 border-l-4 border-red-500";
            } else if (isPaid) {
              cardClass += " bg-green-50";
            }

            if (isNext) cardClass += " border-2 border-blue-500";

            return (
              <Card key={res.id} className={cardClass}>
                <CardContent className="p-4 space-y-3">
                  {/* Header: Name, Dept, Status (Wrapped) */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-xl whitespace-normal break-words leading-tight ${isNoShow ? "line-through text-muted-foreground" : ""}`}>
                          {res.guestName}
                        </div>
                        <div className="text-base font-medium text-blue-600 mt-1 whitespace-normal break-words">
                          {res.department.name}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs font-bold px-2 py-1 rounded border whitespace-nowrap ${isPaid ? "bg-green-100 text-green-700 border-green-200" : isPartial ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                          {isPaid ? 'PAGADO' : isPartial ? 'PARCIAL' : 'PEND.'}
                        </span>
                        {isNoShow && <span className="text-xs font-bold px-2 py-1 rounded border bg-gray-100 text-gray-600 whitespace-nowrap">NO SHOW</span>}
                        {isBlacklisted && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold whitespace-nowrap">BLACKLIST</span>}
                      </div>
                    </div>
                  </div>

                  {/* Dates & Financials (Grid - Wrap enabled) */}
                  <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground border-t pt-3 border-b pb-3">
                    <div className="col-span-2 sm:col-span-1 flex flex-wrap items-center gap-x-2">
                      <span>📅</span>
                      <span className="font-medium text-gray-700 text-base">{format(new Date(res.checkIn), "dd/MM")} - {format(new Date(res.checkOut), "dd/MM")}</span>
                      <span className="text-sm">({Math.max(1, Math.ceil((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / (1000 * 60 * 60 * 24)))} noc)</span>
                    </div>

                    <div className="col-span-2 flex justify-between items-center sm:hidden mt-1">
                      {/* Mobile Row for Financials */}
                      <div className="font-bold text-base text-black">
                        Total: {res.currency === 'USD' ? `US$ ${res.totalAmount}` : formatCurrency(res.totalAmount)}
                      </div>
                      <div className={`font-bold text-base ${!isPaid && !isNoShow ? "text-red-600" : ""}`}>
                        Deuda: {!isPaid && !isNoShow ? (res.currency === 'USD' ? `US$ ${debt}` : formatCurrency(debt)) : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row (Wrapped) */}
                  {!isVisualizer && (
                    <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                      {/* Indicators */}
                      <div className="flex gap-2">
                        {res.hasParking && (
                          <span title="Cochera" className="text-blue-600 flex items-center gap-2 text-sm bg-blue-50 px-4 h-10 rounded border border-blue-100 font-medium whitespace-nowrap"><Car className="h-5 w-5" /> Requiere Cochera</span>
                        )}
                        {res.notes && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button title="Ver nota" className="text-blue-600 flex items-center gap-2 text-sm bg-blue-50 px-4 h-10 rounded border border-blue-100 font-medium"><NotepadText className="h-5 w-5" /> Nota</button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 text-sm bg-white shadow-lg border rounded-md">
                              {res.notes}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2 ml-auto">
                        {!isPaid && !isNoShow && (
                          <Button variant="outline" size="sm" onClick={() => handleMarkPaidClick(res.id, res.totalAmount)} className="h-10 w-10 p-0 text-green-600 bg-green-50/50 border-green-200">
                            <DollarSign className="h-5 w-5" />
                          </Button>
                        )}
                        {canMarkNoShow && (
                          <Button variant="outline" size="sm" onClick={() => handleNoShowClick(res.id)} className="h-10 w-10 p-0 text-orange-500 bg-orange-50/50 border-orange-200">
                            <UserX className="h-5 w-5" />
                          </Button>
                        )}
                        {!isBlacklisted && (
                          <Button variant="outline" size="sm" onClick={() => setReportBlacklistData(res)} className="h-8 w-8 p-0 text-red-500 bg-red-50/50 border-red-200">
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleEdit(res)} className="h-8 px-3 text-xs">
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(res.id)} className="h-8 w-8 p-0">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {sortedData.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No se encontraron reservas.
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteConfirmationId} onOpenChange={(val) => !val && setDeleteConfirmationId(null)}>
        <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmationId && data.find(r => r.id === deleteConfirmationId)?.groupId
                ? "Esta reserva es parte de un grupo dividido. Al eliminarla, se eliminarán TODAS las partes del grupo. ¿Desea continuar?"
                : "Esta acción eliminará la reserva permanentemente. ¿Desea continuar?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>Sí, Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!payConfirmationData} onOpenChange={(val) => !val && setPayConfirmationData(null)}>
        <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pago Total</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desea marcar esta reserva como TOTALMENTE PAGADA?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-green-600 hover:bg-green-700" onClick={confirmMarkPaid}>Sí, Marcar Pagado</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!noShowConfirmationId} onOpenChange={(val) => !val && setNoShowConfirmationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como No Presentado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción indicará que el huésped NO se presentó.
              <br /><br />
              - La seña se mantendrá como ganancia.
              <br />
              - El resto de la deuda se eliminará de los pendientes.
              <br /><br />
              ¿Está seguro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-orange-600 hover:bg-orange-700" onClick={confirmNoShow}>
              Sí, marcar No Presentado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!reportBlacklistData} onOpenChange={(val) => !val && setReportBlacklistData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Reportar a Lista Negra
            </DialogTitle>
          </DialogHeader>
          {reportBlacklistData && (
            <BlacklistForm
              setOpen={(val) => !val && setReportBlacklistData(null)}
              initialData={{
                guestName: reportBlacklistData.guestName,
                guestPhone: reportBlacklistData.guestPhone || "",
                reason: "" // User must fill reason
              }}
              contextData={{
                departmentName: reportBlacklistData.department.name,
                checkIn: reportBlacklistData.checkIn.toString(),
                checkOut: reportBlacklistData.checkOut.toString(),
                totalAmount: reportBlacklistData.totalAmount
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
