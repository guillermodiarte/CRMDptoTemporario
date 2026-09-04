'use client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, XCircle, User, Phone, Calendar, Users, IdCard, Globe, Car, Building2, Clock, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AirbnbBookingReminderModal, ReminderItem } from '@/components/airbnb-booking-reminder-modal';

type Reservation = {
  id: string;
  departmentId: string;
  sessionId: string | null;
  status: string;
  source?: string;
  guestName: string;
  guestPhone: string | null;
  guestDni: string | null;
  guestNationality: string | null;
  guestPeopleCount: number;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  hasParking: boolean;
  groupId: string | null;
  notes: string | null;
  conflictId?: number | null;
  department: { id: string; name: string; images: string; sessionId: string | null };
};

type ApprovalGroup = {
  groupId: string;
  reservations: Reservation[];
  pendingForSession: Reservation[];
};

export function ApprovalsClient({ 
  initialApprovals, 
  currentSessionId 
}: { 
  initialApprovals: ApprovalGroup[]; 
  currentSessionId: string;
}) {
  const [approvals, setApprovals] = useState<ApprovalGroup[]>(initialApprovals);
  const [loading, setLoading] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<Record<string, number>>({});
  const [conflictWarning, setConflictWarning] = useState<{
    groupId: string;
    confirmedConflicts: { deptName: string; checkIn: string; checkOut: string }[];
    pendingConflicts: { deptName: string; checkIn: string; checkOut: string; conflictGroupId: string }[];
  } | null>(null);
  const [highlightedGroupIds, setHighlightedGroupIds] = useState<string[]>([]);
  const [confirmDeny, setConfirmDeny] = useState<string | null>(null);
  const [reminderModal, setReminderModal] = useState<{ isOpen: boolean; items: ReminderItem[] } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!reminderModal) {
      setApprovals(initialApprovals);
    }
  }, [initialApprovals, reminderModal]);

  const handleAction = async (groupId: string, action: 'approve' | 'reject', force = false) => {
    if (action === 'reject' && !force) {
      setConfirmDeny(groupId);
      return;
    }
    setLoading(`${groupId}-${action}`);
    try {
      const bodyObj: Record<string, unknown> = action === 'approve'
        ? { depositAmount: deposits[groupId] ?? 10000 }
        : {};
      if (force && action === 'approve') bodyObj.forceApprove = true;

      const res = await fetch(`/api/admin/approvals/${groupId}/${action}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj)
      });

      if (res.status === 409) {
        // Conflict detected – show warning dialog
        const data = await res.json();
        const conflictGroupIds = (data.pendingConflicts || []).map((c: any) => c.conflictGroupId).filter(Boolean);
        setHighlightedGroupIds(conflictGroupIds);
        setConflictWarning({
          groupId,
          confirmedConflicts: data.confirmedConflicts || [],
          pendingConflicts: data.pendingConflicts || []
        });
      } else if (res.ok) {
        const approvedGroup = approvals.find(g => g.groupId === groupId);
        setConflictWarning(null);
        setHighlightedGroupIds([]);
        setApprovals(prev => prev.filter(g => g.groupId !== groupId));

        if (action === 'approve' && approvedGroup) {
          const allRes = approvedGroup.pendingForSession?.length ? approvedGroup.pendingForSession : approvedGroup.reservations || [];
          const directReservations = allRes.filter(r => !r.source || r.source.toUpperCase() === 'DIRECT');
          if (directReservations.length > 0) {
            setReminderModal({
              isOpen: true,
              items: directReservations.map(r => ({
                departmentName: r.department?.name || 'Departamento',
                checkIn: r.checkIn,
                checkOut: r.checkOut,
              })),
            });
          } else {
            router.refresh();
          }
        } else {
          router.refresh();
        }
      }
    } catch { }
    setLoading(null);
  };

  // --- Conflict warning modal ---
  const ConflictModal = () => {
    if (!conflictWarning) return null;
    const hasConfirmed = conflictWarning.confirmedConflicts.length > 0;
    const hasPending = conflictWarning.pendingConflicts.length > 0;

    const formatConflictDates = (checkIn: string, checkOut: string) => {
      try {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        return `del ${format(start, "d 'de' MMMM", { locale: es })} al ${format(end, "d 'de' MMMM, yyyy", { locale: es })}`;
      } catch {
        return `${checkIn} al ${checkOut}`;
      }
    };

    return (
      <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => { setConflictWarning(null); setHighlightedGroupIds([]); }}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-red-100 dark:bg-red-950/60 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Conflicto de Disponibilidad</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Se detectó superposición con las fechas solicitadas.</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            {hasConfirmed && (
              <div className="p-3.5 bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl space-y-2.5">
                <p className="font-bold text-xs uppercase tracking-wider text-red-800 dark:text-red-300">
                  Reserva ya confirmada en esas fechas:
                </p>
                {conflictWarning.confirmedConflicts.map((c, i) => (
                  <div key={i} className="text-xs text-red-800 dark:text-red-300 bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-red-200/80 dark:border-red-800/60 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-red-900 dark:text-red-200">
                      <Building2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <span>{c.deptName}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      Ya hay una reserva confirmada {formatConflictDates(c.checkIn, c.checkOut)}
                      {c.guestName ? (
                        <> a nombre de <strong className="text-red-700 dark:text-red-400 font-semibold">"{c.guestName}"</strong>.</>
                      ) : '.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {hasPending && (
              <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2.5">
                <p className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Otra solicitud pendiente para esa fecha:
                </p>
                {conflictWarning.pendingConflicts.map((c, i) => (
                  <div key={i} className="text-xs text-amber-800 dark:text-amber-300 bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-amber-200/80 dark:border-amber-800/60 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                      <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span>{c.deptName}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      Hay otra solicitud {formatConflictDates(c.checkIn, c.checkOut)}
                      {c.guestName ? (
                        <> a nombre de <strong className="text-amber-700 dark:text-amber-400 font-semibold">"{c.guestName}"</strong>.</>
                      ) : '.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Si decidís aprobar esta solicitud de todas formas, tené en cuenta que se generará una superposición de fechas (overbooking).
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setConflictWarning(null); setHighlightedGroupIds([]); }}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => { setConflictWarning(null); setHighlightedGroupIds([]); handleAction(conflictWarning.groupId, 'approve', true); }}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
            >
              Aprobar de todas formas
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Deny confirmation modal ---
  const DenyModal = () => {
    if (!confirmDeny) return null;
    return (
      <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmDeny(null)}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Denegar solicitud</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">¿Confirmás que querés denegar esta solicitud? La reserva será eliminada definitivamente.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDeny(null)}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => { const id = confirmDeny; setConfirmDeny(null); handleAction(id, 'reject', true); }}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              Sí, denegar
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (approvals.length === 0) {
    return (
      <>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-12 text-center">
          <ClipboardCheck className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-100">No hay reservas pendientes de aprobación</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Las nuevas solicitudes web aparecerán aquí.</p>
        </div>
        {reminderModal && (
          <AirbnbBookingReminderModal
            isOpen={reminderModal.isOpen}
            onClose={() => {
              setReminderModal(null);
              router.refresh();
            }}
            items={reminderModal.items}
          />
        )}
      </>
    );
  }

  return (
    <>
      <ConflictModal />
      <DenyModal />
      <div className="space-y-6">
      {approvals.map((group) => {
        const isCombination = group.reservations.length > 1;
        const primaryReservation = group.pendingForSession[0] || group.reservations[0];
        const isPending = group.pendingForSession.length > 0;
        const currentDeposit = deposits[group.groupId] ?? 10000;

        // Parse cover image
        let coverImage: string | null = null;
        try {
          const parsed = JSON.parse(primaryReservation.department.images);
          coverImage = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch { coverImage = null; }

        const isHighlighted = highlightedGroupIds.includes(group.groupId);
        const hasConflict = group.reservations.some(r => r.conflictId);

        return (
          <div key={group.groupId} className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-xs overflow-hidden transition-all ${
            isHighlighted ? 'border-orange-400 ring-2 ring-orange-400 ring-opacity-60' :
            hasConflict ? 'border-red-300 dark:border-red-800 ring-1 ring-red-300 ring-opacity-50' : 'border-slate-200 dark:border-slate-800'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              isHighlighted
                ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900'
                : hasConflict
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900'
                  : isPending ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40' : 'bg-slate-50 dark:bg-slate-950/60 border-slate-100 dark:border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <Clock className={`w-5 h-5 ${
                  isHighlighted ? 'text-orange-500' : isPending ? 'text-amber-500' : 'text-slate-400'
                }`} />
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">
                    {isHighlighted ? '⚠️ ' : ''}{isCombination ? 'Reserva Combinada' : 'Solicitud de Reserva'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">ID: {group.groupId.slice(0, 8)}...</p>
                    {isHighlighted && (
                      <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-md border border-orange-300 dark:border-orange-800">
                        En conflicto con otra aprobación pendiente
                      </span>
                    )}
                    {group.reservations.some(r => r.conflictId) && (
                      <span className="text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800">
                        ¡ALERTA DE CONFLICTO!
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isPending ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                {isPending ? 'Pendiente' : 'Procesado'}
              </span>
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-6">
              {/* Guest Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Datos del Huésped</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{primaryReservation.guestName}</span>
                  </div>
                  {primaryReservation.guestPhone && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <a
                        href={`https://wa.me/${primaryReservation.guestPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${primaryReservation.guestName}! Te contacto desde Alojamientos Di'Arte con respecto a tu solicitud de reserva en ${primaryReservation.department?.name || "el departamento"}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 hover:underline"
                        title="Escribir al huésped por WhatsApp"
                      >
                        {primaryReservation.guestPhone}
                      </a>
                    </div>
                  )}
                  {primaryReservation.guestDni && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <IdCard className="w-4 h-4 text-slate-400" />
                      <span>DNI/CI: {primaryReservation.guestDni}</span>
                    </div>
                  )}
                  {primaryReservation.guestNationality && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span>{primaryReservation.guestNationality}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{primaryReservation.guestPeopleCount} persona(s)</span>
                  </div>
                  {primaryReservation.hasParking && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Car className="w-4 h-4" />
                      <span className="font-medium">Necesita cochera</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Alojamiento</h4>
                <div className="space-y-2">
                  {group.reservations.map((res) => {
                    const isMySegment = res.sessionId === currentSessionId;
                    let img: string | null = null;
                    try {
                      const p = JSON.parse(res.department.images);
                      img = Array.isArray(p) ? p[0] : p;
                    } catch {}

                    return (
                      <div key={res.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isMySegment && isPending ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'}`}>
                        {img && <img src={img} alt={res.department.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{res.department.name}</span>
                            {isMySegment && <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">Tu sesión</span>}
                            {res.conflictId && (
                              <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-md font-bold border border-red-200 dark:border-red-800 flex-shrink-0">
                                ⚠️ Conflicto #{res.conflictId}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(res.checkIn), "d MMM", { locale: es })} → {format(new Date(res.checkOut), "d MMM yyyy", { locale: es })}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex-shrink-0">${res.totalAmount.toLocaleString()}</span>
                      </div>
                    );
                  })}

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total (toda la estadía)</span>
                    <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
                      ${group.reservations.reduce((acc, r) => acc + r.totalAmount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {isPending && (
              <div className="px-6 pb-6 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Seña / Adelanto abonado</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Monto depositado para asegurar la reserva.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-bold">$</span>
                    <input 
                      type="number" 
                      className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={currentDeposit}
                      onChange={(e) => setDeposits(prev => ({ ...prev, [group.groupId]: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {isCombination && (
                    <p className="w-full text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-lg p-2.5 mb-1">
                      ℹ️ Esta es una reserva combinada. Al aprobar, solo se confirmará el tramo de <strong>tu sesión</strong>. El otro administrador deberá aprobar su parte.
                    </p>
                  )}
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => handleAction(group.groupId, 'approve')}
                      disabled={loading !== null}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {loading === `${group.groupId}-approve` ? 'Aprobando...' : 'Aprobar'}
                    </button>
                    <button
                      onClick={() => handleAction(group.groupId, 'reject')}
                      disabled={loading !== null}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <XCircle className="w-5 h-5" />
                      {loading === `${group.groupId}-reject` ? 'Denegando...' : 'Denegar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
      {reminderModal && (
        <AirbnbBookingReminderModal
          isOpen={reminderModal.isOpen}
          onClose={() => {
            setReminderModal(null);
            router.refresh();
          }}
          items={reminderModal.items}
        />
      )}
    </>
  );
}

