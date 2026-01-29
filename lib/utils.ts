import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number, currency: string = 'ARS', decimals: number = 2) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
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
