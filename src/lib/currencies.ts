// src/lib/currencies.ts

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
};

export const CURRENCIES: Record<string, Currency> = {
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "$", decimals: 2 },
  USD: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  EUR: { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
//   GBP: { code: "GBP", name: "British Pound", symbol: "£", decimals: 2 },
//   JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0 },
//   AUD: { code: "AUD", name: "Australian Dollar", symbol: "$", decimals: 2 },
//   CHF: { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimals: 2 },
//   CNY: { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimals: 2 },
//   MXN: { code: "MXN", name: "Mexican Peso", symbol: "$", decimals: 2 },
//   KRW: { code: "KRW", name: "South Korean Won", symbol: "₩", decimals: 0 },
} as const;

// Helper array for dropdowns and mapping
export const CURRENCY_LIST = Object.values(CURRENCIES);

/**
 * Converts an integer amount from the database into a formatted currency string.
 * @param amountInSmallestUnit The raw integer from the DB (e.g., 1050 for $10.50)
 * @param currencyCode The ISO currency code (e.g., "CAD", "JPY")
 */
export function formatCurrency(amountInSmallestUnit: number, currencyCode: string): string {
  // Fallback to CAD if an invalid code is passed
  const currency = CURRENCIES[currencyCode] || CURRENCIES.CAD;
  
  // 1. Convert the integer back to a float based on the currency's specific decimals
  const floatValue = amountInSmallestUnit / Math.pow(10, currency.decimals);

  // 2. Format the output using standard internationalization rules
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(floatValue);
}