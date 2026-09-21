import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { BalanceClient } from "@/components/balance-client";
import { getDollarRate } from "@/lib/dollar";

export const dynamic = 'force-dynamic';

export default async function BalancePage() {
  const session = await auth();
  const sessionId = session?.user?.sessionId;
  const userRole = session?.user?.role;
  let userEmail = session?.user?.email?.toLowerCase().trim();

  if (!sessionId) {
    redirect("/dashboard");
  }

  // Ensure userEmail is loaded even if session doesn't carry it directly
  if (!userEmail && session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    userEmail = dbUser?.email?.toLowerCase().trim();
  }

  // Check if user has access to balance panel
  const isSuperAdmin = !!(session?.user as any)?.isSuperAdmin;
  const balanceSetting = await prisma.systemSettings.findFirst({
    where: {
      sessionId,
      key: { in: ["BALANCE_ENABLED_USERS", "SHOW_BALANCE_MENU"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  let hasBalanceAccess = isSuperAdmin;
  if (!hasBalanceAccess && balanceSetting?.value) {
    try {
      const enabledUsers: string[] = JSON.parse(balanceSetting.value);
      hasBalanceAccess = userEmail
        ? enabledUsers.map((e) => e.toLowerCase().trim()).includes(userEmail)
        : false;
    } catch {
      hasBalanceAccess = false;
    }
  }

  if (!hasBalanceAccess) {
    redirect("/dashboard");
  }

  const dollarRate = await getDollarRate();

  // Fetch payment receivers
  const receivers = prisma.paymentReceiver
    ? await prisma.paymentReceiver.findMany({
        where: { sessionId, isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      })
    : [];

  // Fetch cleaning expense setting for balance
  const cleaningSetting = await prisma.systemSettings.findUnique({
    where: { sessionId_key: { sessionId, key: "CLEANING_EXPENSE_IN_BALANCE" } },
  });
  const cleaningExpenseEnabled = cleaningSetting?.value === "true";

  // Fetch manual transfers edit setting
  const manualTransfersSetting = await prisma.systemSettings.findUnique({
    where: { sessionId_key: { sessionId, key: "MANUAL_TRANSFERS_EDIT_ENABLED" } },
  });
  const manualTransfersEditEnabled = manualTransfersSetting?.value === "true";

  // Fetch all manual transfers adjustments for this session
  const manualTransfersRecords = await prisma.systemSettings.findMany({
    where: {
      sessionId,
      key: { startsWith: "BALANCE_MANUAL_TRANSFERS_" },
    },
  });

  const initialManualTransfers: Record<string, { year: number; month: number; editedAt: string; editedBy: string; receivers: Record<string, number> }> = {};
  for (const rec of manualTransfersRecords) {
    try {
      const parsed = JSON.parse(rec.value);
      const suffix = rec.key.replace("BALANCE_MANUAL_TRANSFERS_", "");
      initialManualTransfers[suffix] = parsed;
    } catch {}
  }

  // Fetch expenses for the session
  const expenses = await prisma.expense.findMany({
    where: { sessionId, isDeleted: false },
    include: {
      department: { select: { name: true } },
      paymentReceiver: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  // Fetch all paid/partial reservations + cancelled with deposits to calculate balance
  const reservations = await prisma.reservation.findMany({
    where: {
      sessionId,
      OR: [
        {
          paymentStatus: { in: ["PAID", "PARTIAL"] },
          status: { notIn: ["CANCELLED"] },
        },
        {
          status: "CANCELLED",
          depositAmount: { gt: 0 },
        },
        {
          paymentStatus: "CANCELLED",
          depositAmount: { gt: 0 },
        },
      ],
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
      expenses={expenses as any}
      cleaningExpenseEnabled={cleaningExpenseEnabled}
      summaryStats={summaryStats}
      dollarRate={dollarRate}
      isSuperAdmin={isSuperAdmin}
      userRole={userRole ?? 'VISUALIZER'}
      manualTransfersEditEnabled={manualTransfersEditEnabled}
      initialManualTransfers={initialManualTransfers}
    />
  );
}
