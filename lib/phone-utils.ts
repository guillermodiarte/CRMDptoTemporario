export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";

  // 1. Remove all non-numeric characters (except + initially, but effectively for comparison we want digits)
  // Actually, user requirement says:
  // If +54... -> strip prefix
  // If +Other... -> keep full

  // Let's strip spaces/dashes first for processing
  let clean = phone.replace(/\s|-|\(|\)/g, "");

  // Check for Argentina prefixes
  // +549...
  // +54...
  // 549...

  if (clean.startsWith("+549")) {
    return clean.slice(4); // Remove +549
  }
  if (clean.startsWith("+54")) {
    return clean.slice(3); // Remove +54 (assuming next digit is area code)
  }
  if (clean.startsWith("549")) {
    return clean.slice(3); // Remove 549
  }

  // If it's a local number like 0351... or 351... 
  // It's hard to be perfect without libphonenumber, but the prompt says 
  // "3513146924" is the target.
  // We can assume if it doesn't start with +, it's likely local or already stripped.

  // International cases
  if (clean.startsWith("+") && !clean.startsWith("+54")) {
    return clean; // Keep full international
  }

  return clean;
}
