'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
import { useApprovals } from '@/components/approvals-provider';

interface ApprovalsNavLinkProps {
  mobile?: boolean;
  onClick?: () => void;
}

export function ApprovalsNavLink({ mobile = false, onClick }: ApprovalsNavLinkProps) {
  const pathname = usePathname();
  const { pendingCount } = useApprovals();
  const isActive = pathname === '/dashboard/approvals';
  const hasPending = pendingCount > 0;

  if (mobile) {
    return (
      <Link
        href="/dashboard/approvals"
        onClick={onClick}
        className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all ${
          hasPending
            ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/15 border border-amber-500/50 dark:border-amber-400/40 text-amber-950 dark:text-amber-200 font-bold shadow-xs'
            : isActive
            ? 'bg-muted text-foreground font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted font-medium'
        }`}
      >
        <div className="relative flex items-center shrink-0">
          <ClipboardCheck
            className={`h-5 w-5 ${
              hasPending ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-amber-500'
            }`}
          />
          {hasPending && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </div>
        <span className="flex-1">Aprobaciones</span>
        {hasPending && (
          <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 min-w-[20px] h-5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs animate-pulse">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard/approvals"
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
        hasPending
          ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/15 border border-amber-500/50 dark:border-amber-400/40 text-amber-950 dark:text-amber-200 font-bold shadow-xs hover:from-amber-500/30 hover:via-orange-500/25 hover:to-amber-500/20'
          : isActive
          ? 'bg-muted text-foreground font-semibold'
          : 'text-muted-foreground hover:text-primary hover:bg-muted font-medium'
      }`}
    >
      <div className="relative flex items-center shrink-0">
        <ClipboardCheck
          className={`h-5 w-5 ${
            hasPending ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-amber-500'
          }`}
        />
        {hasPending && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        )}
      </div>
      <span className="flex-1">Aprobaciones</span>
      {hasPending && (
        <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 min-w-[20px] h-5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs animate-pulse tracking-tight">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </Link>
  );
}
