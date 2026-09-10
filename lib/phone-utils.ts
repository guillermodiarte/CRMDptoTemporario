/**
 * phone-utils.ts
 * 
 * Utility to normalize Argentine (and international) phone numbers so that
 * any of these representations of the same number match each other:
 *
 *   +54 9 3704 74‑7426
 *   +54 3704 74‑7426
 *   549 3704747426
 *   3704 74‑7426
 *   370474‑7426
 *   3704747426
 *   3704 747426
 *   370 4747426
 *   3 7 0 4 7 4 7 4 2 6
 *
 * Strategy:
 *  1. Strip every non-digit character.
 *  2. Remove leading Argentine country codes (54, 549) leaving just the
 *     local number. The local number is always 10 digits in Argentina
 *     (area code + subscriber number, without the leading 0).
 *  3. For the "9" mobile prefix that appears after +54: also strip it so
 *     +54 9 3704… → 3704…
 *  4. Return the last 10 digits as the canonical form.
 *
 * This means:
 *  normalizePhone("+54 9 3704 74-7426") === "3704747426"
 *  normalizePhone("3 7 0 4 7 4 7 4 2 6") === "3704747426"
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";

  // Strip everything that is not a digit
  const digits = phone.replace(/\D/g, "");

  if (!digits) return "";

  // Argentine numbers are 10 digits locally (area + subscriber without leading 0)
  // With country code they can be:
  //   549 + 10 digits = 13 digits  (+54 9 AAAA NNNNNN → remove 549)
  //   54  + 10 digits = 12 digits  (+54 AAAA NNNNNN   → remove 54)
  //   0   + 10 digits = 11 digits  (0AAAA NNNNNN      → remove leading 0)

  if (digits.length >= 13 && digits.startsWith("549")) {
    // e.g. 5493704747426 → 3704747426
    return digits.slice(3);
  }

  if (digits.length >= 12 && digits.startsWith("54")) {
    // e.g. 543704747426 → 3704747426
    // But first check if after "54" we have a "9" (mobile prefix): 54 9 AAAA…
    const rest = digits.slice(2);
    if (rest.length === 11 && rest.startsWith("9")) {
      return rest.slice(1); // remove the 9
    }
    return rest;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    // e.g. 03704747426 → 3704747426
    return digits.slice(1);
  }

  // For anything ≥ 10 digits return the last 10 (catches weird prefixes)
  if (digits.length > 10) {
    return digits.slice(-10);
  }

  return digits;
}

/**
 * Returns true if two phone strings represent the same phone number
 * after normalization.
 */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}

/**
 * Returns true if the search query (normalized) is contained within
 * the phone's normalized form — useful for partial searches like "3704".
 */
export function phoneMatchesQuery(phone: string | null | undefined, query: string): boolean {
  const np = normalizePhone(phone);
  const nq = normalizePhone(query);
  if (!nq) return false;
  return np.includes(nq);
}
