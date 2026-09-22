'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export type PendingReservation = {
  id: string;
  departmentId: string;
  sessionId: string | null;
  status: string;
  guestName: string;
  department: { name: string };
};

export type ApprovalGroup = {
  groupId: string;
  pendingForSession: PendingReservation[];
};

interface ApprovalsContextType {
  groups: ApprovalGroup[];
  pendingCount: number;
  pulse: boolean;
  fetchApprovals: () => Promise<void>;
}

const ApprovalsContext = createContext<ApprovalsContextType | undefined>(undefined);

export function ApprovalsProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<ApprovalGroup[]>([]);
  const [pulse, setPulse] = useState(false);
  const pathname = usePathname();

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/approvals', { cache: 'no-store' });
      if (res.ok) {
        const data: ApprovalGroup[] = await res.json();
        const pending = (data || []).filter(g => g.pendingForSession && g.pendingForSession.length > 0);
        
        setGroups(prevGroups => {
          if (pending.length > prevGroups.length && prevGroups.length === 0) {
            setPulse(true);
          }
          return pending;
        });
      }
    } catch {
      // Ignore network errors during polling
    }
  }, []);

  // Poll every 15s and fetch on mount
  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 15000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  // Also refetch when navigating routes
  useEffect(() => {
    fetchApprovals();
  }, [pathname, fetchApprovals]);

  // Listen to manual update events (e.g. after approval/rejection)
  useEffect(() => {
    const handleUpdated = () => {
      fetchApprovals();
    };
    window.addEventListener('approvals-updated', handleUpdated);
    return () => window.removeEventListener('approvals-updated', handleUpdated);
  }, [fetchApprovals]);

  useEffect(() => {
    if (pulse) {
      const t = setTimeout(() => setPulse(false), 1000);
      return () => clearTimeout(t);
    }
  }, [pulse]);

  return (
    <ApprovalsContext.Provider
      value={{
        groups,
        pendingCount: groups.length,
        pulse,
        fetchApprovals,
      }}
    >
      {children}
    </ApprovalsContext.Provider>
  );
}

export function useApprovals() {
  const context = useContext(ApprovalsContext);
  if (!context) {
    return {
      groups: [],
      pendingCount: 0,
      pulse: false,
      fetchApprovals: async () => {},
    };
  }
  return context;
}
