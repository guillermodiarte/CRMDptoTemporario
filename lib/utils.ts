import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { z } from "zod"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses numbers flexibly from user input, pasted strings, or API payloads.
 * Supports:
 * - Comma (,) and Period (.) as decimal separator (e.g. "135,23" -> 135.23, "135.23" -> 135.23)
 * - Thousands / Millions separators with dots (e.g. "12.035" -> 12035, "1.250.000" -> 1250000)
 * - Mixed notation (e.g. "1.250.000,50" -> 1250000.5, "1,250,000.50" -> 1250000.5)
 * - Currencies and whitespace (e.g. "$ 12.035" -> 12035, "US$ 135.23" -> 135.23)
 */
export function parseFlexibleNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;

  let s = String(value).trim();
  if (s === "") return 0;

  // Clean currency symbols, prefixes, and spaces
  s = s
    .replace(/^(ARS|USD|US\$|\$)\s*/i, "")
    .replace(/[\$\s\u00a0]/g, "")
    .replace(/^(ARS|USD|US)\s*/i, "");

  let isNegative = false;
  if (s.startsWith("-")) {
    isNegative = true;
    s = s.slice(1).trim();
  } else if (s.startsWith("+")) {
    s = s.slice(1).trim();
  }

  const dotCount = (s.match(/\./g) || []).length;
  const commaCount = (s.match(/,/g) || []).length;

  if (dotCount > 0 && commaCount > 0) {
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastComma > lastDot) {
      // e.g. 1.234.567,89 -> dots are thousands, comma is decimal
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // e.g. 1,234,567.89 -> commas are thousands, dot is decimal
      s = s.replace(/,/g, "");
    }
  } else if (dotCount > 1) {
    // e.g. 1.250.000 -> dots are thousands/millions
    s = s.replace(/\./g, "");
  } else if (commaCount > 1) {
    // e.g. 1,250,000 -> commas are thousands/millions
    s = s.replace(/,/g, "");
  } else if (dotCount === 1) {
    const parts = s.split(".");
    const before = parts[0];
    const after = parts[1];
    // If followed by exactly 3 digits and integer part is not "0", it is thousands separator (e.g. 12.035 -> 12035)
    if (after.length === 3 && before !== "0" && before !== "") {
      s = before + after;
    } else {
      // Otherwise decimal (e.g. 135.23 -> 135.23, 12.5 -> 12.5, 0.035 -> 0.035)
      s = before + "." + after;
    }
  } else if (commaCount === 1) {
    const parts = s.split(",");
    const before = parts[0];
    const after = parts[1];
    // If copied with 3 digits and non-zero integer (e.g. 12,035 from US format)
    if (after.length === 3 && before !== "0" && before !== "") {
      s = before + after;
    } else {
      s = before + "." + after;
    }
  }

  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

export const zFlexibleNumber = (min?: number, errorMsg?: string) => {
  let numSchema = z.number();
  if (min !== undefined) numSchema = numSchema.min(min, errorMsg);
  return z.preprocess((val) => parseFlexibleNumber(val), numSchema);
};

export const zFlexibleNumberOptional = (defaultValue: number = 0) => {
  return z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return defaultValue;
    return parseFlexibleNumber(val);
  }, z.number().optional());
};

export const formatNumber = (amount: number | string, minDecimals: number = 0, maxDecimals: number = 2): string => {
  const num = typeof amount === "number" ? (isNaN(amount) ? 0 : amount) : parseFlexibleNumber(amount);
  const hasDecimals = num % 1 !== 0;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: hasDecimals ? (minDecimals || 2) : minDecimals,
    maximumFractionDigits: hasDecimals ? maxDecimals : minDecimals,
  }).format(num);
};

export const formatPrice = (amount: number | string, prefix: string = "$"): string => {
  return `${prefix}${formatNumber(amount)}`;
};

export const formatCurrency = (amount: number | string, currency: string = 'ARS', decimals?: number) => {
  const num = typeof amount === "number" ? (isNaN(amount) ? 0 : amount) : parseFlexibleNumber(amount);
  const isNegative = num < -0.00001;
  const absNum = Math.abs(num);
  const formatted = decimals !== undefined
    ? new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(absNum)
    : formatNumber(absNum);

  const prefix = currency === 'USD' ? 'US$ ' : '$ ';
  return isNegative ? `-${prefix}${formatted}` : `${prefix}${formatted}`;
};

export const formatSignedCurrency = (
  amount: number | string,
  forcePlus: boolean = false,
  currency: string = 'ARS',
  decimals?: number
) => {
  const num = typeof amount === "number" ? (isNaN(amount) ? 0 : amount) : parseFlexibleNumber(amount);
  const isNegative = num < -0.00001;
  const isPositive = num > 0.00001;
  const absNum = Math.abs(num);
  const formatted = decimals !== undefined
    ? new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(absNum)
    : formatNumber(absNum);

  const prefix = currency === 'USD' ? 'US$ ' : '$ ';
  if (isNegative) {
    return `-${prefix}${formatted}`;
  }
  if (isPositive && forcePlus) {
    return `+${prefix}${formatted}`;
  }
  return `${prefix}${formatted}`;
};

export const formatAxisNumber = (value: number) => {
  if (value === 0) return "$ 0";

  if (value >= 1000000) {
    const millions = value / 1000000;
    // Use maximumFractionDigits 1 to avoid excessive decimals, e.g. 1.5 Millones
    const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(millions);
    return `${formatted} ${millions === 1 ? 'Millón' : 'Millones'}`;
  }

  if (value >= 1000) {
    const thousands = value / 1000;
    const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(thousands);
    return `${formatted} Mil`;
  }

  return formatCurrency(value, 'ARS', 0);
};
