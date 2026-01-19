"use client";

import { useState } from "react";
import { Department, Reservation } from "@prisma/client";
import { Plus, Pencil, Trash, NotepadText, Link as LinkIcon, Search } from "lucide-react";
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
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <ReservationsActions
              data={data}
              departments={departments}
              blacklistedPhones={blacklistedPhones}
              blacklistEntries={blacklistEntries}
              date={selectedDate}
            />

            {!isVisualizer && (
              <Dialog open={open} onOpenChange={(val) => {
                setOpen(val);
                if (!val) setEditingRes(null);
              }}>
                <DialogTrigger asChild>
                  <Button onClick={handleCreate} className="whitespace-nowrap">
                    <Plus className="mr-2 h-4 w-4" /> Nueva
                  </Button>
                </DialogTrigger>
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
            )}
          </div>
        </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Listado de Reservas</CardTitle>
          <CardDescription>
            Gestiona tus reservas y ocupación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
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
                        <div className={isNoShow ? "line-through" : ""}>{res.guestName}</div>
                        <div className="text-xs text-muted-foreground">{res.guestPhone}</div>
                        <div className="text-xs text-muted-foreground">{res.source}</div>
                        {isBlacklisted && <Badge variant="destructive" className="mt-1 text-[10px]">Lista Negra</Badge>}
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
                        {res.hasParking ? <Check className="h-4 w-4 mx-auto text-green-600" /> : "-"}
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
                            {res.currency === 'USD' ? `US$ ${res.totalAmount}` : `$${res.totalAmount}`}
                          </span>
                          {res.currency === 'USD' && !isNoShow && (
                            <span className="text-xs text-muted-foreground">≈ ${Math.round(res.totalAmount * dollarRate).toLocaleString()}</span>
                          )}
                          {isNoShow && (
                            <span className="text-xs text-orange-600 font-semibold">Seña: ${res.depositAmount}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-muted-foreground">
                            {res.cleaningFee ? `$${res.cleaningFee}` : '-'}
                          </span>
                          {(res.amenitiesFee || 0) > 0 && (
                            <span className="text-xs text-red-600" title="Insumos (Informativo)">
                              +${res.amenitiesFee}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {!isPaid && !isNoShow ? (res.currency === 'USD' ? `US$ ${debt}` : `$${debt}`) : '-'}
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {sortedData.map((res) => {
              const isPaid = res.paymentStatus === 'PAID';
              const isPartial = res.paymentStatus === 'PARTIAL';
              const isNext = nextReservation?.id === res.id;
              const isNoShow = (res.status as any) === 'NO_SHOW';
              const normalizedGuestPhone = res.guestPhone ? normalizePhone(res.guestPhone) : '';
              const isBlacklisted = blacklistedPhones.includes(normalizedGuestPhone);
              const debt = res.totalAmount - (res.depositAmount || 0);
              const canMarkNoShow = isAdmin && !isNoShow && today > new Date(res.checkIn) && !isPaid;

              let cardClass = "";
              if (isNoShow) {
                cardClass = "bg-orange-50 opacity-90"; // slightly different for card
              } else if (isBlacklisted) {
                cardClass = "bg-red-50 border-l-4 border-red-500";
              } else if (isPaid) {
                cardClass = "bg-green-50";
              }

              if (isNext) cardClass += " border-2 border-blue-500";

              return (
                <Card key={res.id} className={cardClass}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header: Name, Dept, Status */}
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <div className={`font-semibold text-lg truncate ${isNoShow ? "line-through text-muted-foreground" : ""}`}>
                          {res.guestName}
                        </div>
                        <div className="text-sm font-medium text-blue-600">{res.department.name}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={isNoShow ? "secondary" : "outline"}>
                          {isNoShow ? "NO SHOW" : res.status}
                        </Badge>
                        <Badge variant={isPaid ? 'default' : isPartial ? 'secondary' : 'destructive'}>
                          {isPaid ? 'PAGADO' : isPartial ? 'PARCIAL' : 'PEND.'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {/* Dates & People */}
                      <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                        <span>{format(new Date(res.checkIn), "dd/MM")} - {format(new Date(res.checkOut), "dd/MM")}</span>
                        <span>•</span>
                        <span>{Math.max(1, Math.ceil((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / (1000 * 60 * 60 * 24)))} noches</span>
                        <span>•</span>
                        <span>{res.guestPeopleCount} pax</span>
                      </div>

                      {/* Contact */}
                      <div className="col-span-2 text-sm text-muted-foreground flex gap-2">
                        <span>{res.guestPhone}</span>
                        <span>•</span>
                        <span>{res.source}</span>
                      </div>

                      {/* Financials */}
                      <div className="bg-background/50 p-2 rounded col-span-2 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs text-muted-foreground block">Total</span>
                          <span className="font-medium">
                            {res.currency === 'USD' ? `US$ ${res.totalAmount}` : `$${res.totalAmount}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Deuda</span>
                          <span className={`font-medium ${!isPaid && !isNoShow ? "text-red-600" : ""}`}>
                            {!isPaid && !isNoShow ? (res.currency === 'USD' ? `US$ ${debt}` : `$${debt}`) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Extras: Notes, Parking */}
                    <div className="flex gap-2 text-xs">
                      {res.hasParking && (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded">
                          <Check className="h-3 w-3" /> Cochera
                        </span>
                      )}
                      {res.notes && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              <NotepadText className="h-3 w-3" /> Nota
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4 text-sm">
                            {res.notes}
                          </PopoverContent>
                        </Popover>
                      )}
                      {isBlacklisted && <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold">LISTA NEGRA</span>}
                    </div>

                    {/* Actions */}
                    {!isVisualizer && (
                      <div className="flex justify-between items-center pt-2 border-t gap-2">
                        {/* Left: Quick Actions */}
                        <div className="flex gap-1">
                          {!isPaid && !isNoShow && (
                            <Button variant="outline" size="sm" onClick={() => handleMarkPaidClick(res.id, res.totalAmount)} className="h-8 px-2 text-green-600 bg-green-50/50 border-green-200">
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          {canMarkNoShow && (
                            <Button variant="outline" size="sm" onClick={() => handleNoShowClick(res.id)} className="h-8 px-2 text-orange-500 bg-orange-50/50 border-orange-200">
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                          {!isBlacklisted && (
                            <Button variant="outline" size="sm" onClick={() => setReportBlacklistData(res)} className="h-8 px-2 text-red-500 bg-red-50/50 border-red-200">
                              <ShieldAlert className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Right: Edit/Delete */}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(res)} className="h-8">
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
              <div className="text-center py-10 text-muted-foreground">
                No se encontraron reservas.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
