import { startOfMonth, endOfMonth, addDays, differenceInCalendarDays, isSameMonth, isAfter, isBefore } from "date-fns";

export interface ReservationSplit {
  checkIn: Date;
  checkOut: Date;
  totalAmount: number;
  cleaningFee: number;
  depositAmount: number; // Only for first part
}

export function calculateReservationSplits(
  checkIn: Date,
  checkOut: Date,
  totalAmount: number,
  cleaningFee: number,
  depositAmount: number = 0
): ReservationSplit[] {
  const splits: ReservationSplit[] = [];

  // Normalize dates to start of day to avoid time zone issues during calculation
  const start = new Date(checkIn);
  start.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);

  const totalDays = Math.max(1, differenceInCalendarDays(end, start));
  const pricePerDay = totalAmount / totalDays;

  let currentStart = start;

  // Loop until we cover the entire period
  while (isBefore(currentStart, end)) {
    // Determine the end of the current segment (either end of month or end of reservation)
    const endOfMonthDate = endOfMonth(currentStart);
    let currentEnd = isAfter(end, endOfMonthDate) ? addDays(endOfMonthDate, 1) : end; // add 1 day because check-out is usually roughly "next day 10AM" logic, but for calculation we need the midnight of next month

    // Correction: If reservation ends on the 1st of next month, endOfMonth is previous day.
    // If end > endOfMonthDate + 1 ms...
    // Let's rely on date-fns comparison.
    // If our reservation is Jan 30 to Feb 3.
    // Segment 1: Jan 30. End of Month: Jan 31.
    // We want segment to enable Feb 1 check-in for next part.
    // So Segment 1 CheckOut = Feb 1 00:00.

    if (isAfter(end, addDays(endOfMonthDate, 1))) {
      currentEnd = addDays(endOfMonthDate, 1); // Feb 1 00:00
    } else {
      currentEnd = end;
    }

    // Safety check for infinite loop
    if (!isAfter(currentEnd, currentStart)) {
      currentEnd = addDays(currentStart, 1);
    }

    const daysInSegment = differenceInCalendarDays(currentEnd, currentStart);

    // Calculate cost for this segment
    const segmentCost = Math.round(daysInSegment * pricePerDay); // Round to avoid float issues, maybe ceil? User said proportional.

    // Rules:
    // Cleaning Fee: Only first segment
    // Deposit: Only first segment

    const isFirstSegment = splits.length === 0;

    splits.push({
      checkIn: currentStart,
      checkOut: currentEnd,
      totalAmount: segmentCost,
      cleaningFee: isFirstSegment ? cleaningFee : 0,
      depositAmount: isFirstSegment ? depositAmount : 0,
    });

    // Next segment starts where this one ended
    currentStart = currentEnd;
  }

  // Correction step: Ensure the sum of segment costs equals totalAmount?
  // User said "Divide proportional". Rounding might cause off-by-one errors.
  // Ideally, last segment takes the remainder.

  const currentSum = splits.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const diff = totalAmount - currentSum;

  if (diff !== 0 && splits.length > 0) {
    // Adjust last segment
    splits[splits.length - 1].totalAmount += diff;
  }

  return splits;
}
