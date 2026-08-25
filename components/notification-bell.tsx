'use client';
import { useState, useEffect, useCallback } from 'react';
import { Bell, Clock, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Reservation = {
  id: string;
  departmentId: string;
  sessionId: string | null;
  status: string;
  guestName: string;
  department: { name: string };
};

type ApprovalGroup = {
  groupId: string;
  pendingForSession: Reservation[];
};

export function NotificationBell() {
  const [groups, setGroups] = useState<ApprovalGroup[]>([]);
  const [pulse, setPulse] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/approvals', { cache: 'no-store' });
      if (res.ok) {
        const data: ApprovalGroup[] = await res.json();
        const pending = data.filter(g => g.pendingForSession.length > 0);
        
        setGroups(prevGroups => {
          if (pending.length > prevGroups.length && prevGroups.length === 0) {
            setPulse(true);
          }
          return pending;
        });
      }
    } catch { }
  }, []);

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 15000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  useEffect(() => {
    if (pulse) {
      const t = setTimeout(() => setPulse(false), 1000);
      return () => clearTimeout(t);
    }
  }, [pulse]);

  const count = groups.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-muted transition-colors outline-none"
          title={count > 0 ? `${count} reserva(s) pendiente(s) de aprobación` : 'Sin notificaciones'}
        >
          <Bell className={`w-5 h-5 transition-all ${count > 0 ? 'text-amber-500' : 'text-muted-foreground'} ${pulse ? 'scale-125' : 'scale-100'}`} />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-in zoom-in duration-300">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-md">
          <h4 className="font-semibold text-slate-800 text-sm">Notificaciones</h4>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {count === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No hay reservas pendientes.
            </div>
          ) : (
            <div className="flex flex-col">
              {groups.map(group => {
                const primaryRes = group.pendingForSession[0];
                return (
                  <button
                    key={group.groupId}
                    onClick={() => {
                      setOpen(false);
                      router.push('/dashboard/approvals');
                    }}
                    className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left flex gap-3 items-start last:border-0"
                  >
                    <div className="mt-0.5 p-2 bg-amber-100 text-amber-600 rounded-full">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 line-clamp-1">
                        Reserva de {primaryRes?.guestName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{primaryRes?.department?.name}</span>
                        {group.pendingForSession.length > 1 && (
                          <span className="text-amber-600 font-medium">
                            +{group.pendingForSession.length - 1} más
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
