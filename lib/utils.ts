import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatNumber = (amount: number | string, minDecimals: number = 0, maxDecimals: number = 2): string => {
  const num = Number(amount) || 0;
  const hasDecimals = num % 1 !== 0;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: hasDecimals ? (minDecimals || 2) : minDecimals,
    maximumFractionDigits: hasDecimals ? maxDecimals : minDecimals,
  }).format(num);
};

export const formatPrice = (amount: number | string, prefix: string = "$"): string => {
  return `${prefix}${formatNumber(amount)}`;
};

export const formatCurrency = (amount: number, currency: string = 'ARS', decimals?: number) => {
  const num = Number(amount) || 0;
  const formatted = decimals !== undefined
    ? new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num)
    : formatNumber(num);

  if (currency === 'USD') {
    return `US$ ${formatted}`;
  }
  return `$ ${formatted}`;
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
