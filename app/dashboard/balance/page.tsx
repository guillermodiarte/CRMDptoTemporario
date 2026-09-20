import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { BalanceClient } from "@/components/balance-client";

export const dynamic = 'force-dynamic';

export default async function BalancePage() {
  const session = await auth();
  const sessionId = session?.user?.sessionId;
  const userRole = session?.user?.role;
  const userEmail = session?.user?.email?.toLowerCase().trim();

  if (!sessionId || userRole !== 'ADMIN') {
    redirect("/dashboard");
  }

  // Check if user has access to balance panel
  const isSuperAdmin = !!(session?.user as any)?.isSuperAdmin;
  const balanceSetting = await prisma.systemSettings.findUnique({
    where: { sessionId_key: { sessionId, key: "BALANCE_ENABLED_USERS" } }
  });

  let hasBalanceAccess = isSuperAdmin;
  if (!hasBalanceAccess && balanceSetting?.value) {
    try {
      const enabledUsers: string[] = JSON.parse(balanceSetting.value);
      hasBalanceAccess = userEmail ? enabledUsers.includes(userEmail) : false;
    } catch { hasBalanceAccess = false; }
  }

  if (!hasBalanceAccess) {
    redirect("/dashboard");
  }

  // Fetch payment receivers
  const receivers = prisma.paymentReceiver
    ? await prisma.paymentReceiver.findMany({
        where: { sessionId, isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      })
    : [];

  // Fetch all paid/partial reservations (not cancelled) to calculate balance
  const reservations = await prisma.reservation.findMany({
    where: {
      sessionId,
      paymentStatus: { in: ["PAID", "PARTIAL"] },
      status: { notIn: ["CANCELLED"] },
    },
    include: {
      department: { select: { name: true } },
      paymentReceiver: { select: { id: true, name: true } },
      depositReceiver: { select: { id: true, name: true } },
    },
    orderBy: { checkIn: "desc" },
  });

  // --- Compute summary stats ---
  let totalCash = 0;
  let totalTransfer = 0;
  let totalDeposits = 0;
  const transferByReceiver: Record<string, { name: string; amount: number }> = {};
  const depositByReceiver: Record<string, { name: string; amount: number }> = {};

  for (const res of reservations) {
    const isPaid = res.paymentStatus === "PAID";
    const isPartial = res.paymentStatus === "PARTIAL";

    // 1. Seña (deposit)
    // If PARTIAL, the seña is depositAmount.
    // If PAID, check if a distinct seña was recorded
    const hadDeposit = (res.depositAmount || 0) > 0 && (isPartial || (res.depositAmount || 0) < res.totalAmount || !!res.depositMethod);
    const depositAmt = hadDeposit ? (res.depositAmount || 0) : 0;

    if (depositAmt > 0) {
      totalDeposits += depositAmt;
      const dMethod = res.depositMethod || 'TRANSFER'; // señas default to transfer
      const dRecv = res.depositReceiver;

      if (dMethod === 'CASH') {
        totalCash += depositAmt;
      } else {
        totalTransfer += depositAmt;
        if (dRecv) {
          if (!depositByReceiver[dRecv.id]) depositByReceiver[dRecv.id] = { name: dRecv.name, amount: 0 };
          depositByReceiver[dRecv.id].amount += depositAmt;

          if (!transferByReceiver[dRecv.id]) transferByReceiver[dRecv.id] = { name: dRecv.name, amount: 0 };
          transferByReceiver[dRecv.id].amount += depositAmt;
        }
      }
    }

    // 2. Final payment (only for PAID reservations)
    if (isPaid) {
      const remainingAmt = Math.max(0, res.totalAmount - depositAmt);
      if (remainingAmt > 0) {
        const payMethod = (res as any).paymentMethod || 'CASH';
        const payRecv = res.paymentReceiver;

        if (payMethod === 'CASH') {
          totalCash += remainingAmt;
        } else if (payMethod === 'TRANSFER') {
          totalTransfer += remainingAmt;
          if (payRecv) {
            if (!transferByReceiver[payRecv.id]) transferByReceiver[payRecv.id] = { name: payRecv.name, amount: 0 };
            transferByReceiver[payRecv.id].amount += remainingAmt;
          }
        }
      }
    }
  }

  const summaryStats = {
    totalCash,
    totalTransfer,
    totalDeposits,
    transferByReceiver: Object.values(transferByReceiver),
    depositByReceiver: Object.values(depositByReceiver),
  };

  return (
    <BalanceClient
      reservations={reservations as any}
      receivers={receivers}
      summaryStats={summaryStats}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
