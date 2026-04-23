/**
 * Pure utility functions extracted from UI components for testability.
 */

export type CounterFormat = "number" | "currency" | "percent";
export type RiskLevel = "conservative" | "balanced" | "aggressive" | "degen";

/**
 * Formats a numeric value for the AnimatedCounter component.
 */
export function formatCounterValue(
  value: number,
  format: CounterFormat,
  prefix: string,
  suffix: string
): string {
  let formatted: string;

  switch (format) {
    case "currency":
      formatted = `$${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      break;
    case "percent":
      formatted = `${value.toLocaleString("en-US", {
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 1,
      })}%`;
      break;
    default:
      formatted = value.toLocaleString("en-US");
      break;
  }

  return `${prefix}${formatted}${suffix}`;
}

/**
 * Returns a CSS color class string based on confidence percentage.
 * 0-30%: red, 31-60%: amber, 61-100%: green
 */
export function getConfidenceColor(value: number): string {
  if (value <= 30) return "bg-red-500";
  if (value <= 60) return "bg-amber-500";
  return "bg-green-500";
}

/**
 * Derives a hue (0-359) from a token symbol string using a simple hash.
 */
export function getHueFromSymbol(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 360;
}

/**
 * Truncates an Ethereum address to 0x1234...5678 format.
 */
export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Returns Tailwind CSS classes for risk level badge styling.
 */
export function getRiskLevelStyles(level: RiskLevel): string {
  switch (level) {
    case "conservative":
      return "bg-primary/20 text-primary border-primary/30";
    case "balanced":
      return "bg-primary/20 text-primary border-primary/30";
    case "aggressive":
      return "bg-secondary/20 text-secondary border-secondary/30";
    case "degen":
      return "bg-destructive/20 text-destructive border-destructive/30";
  }
}

/**
 * Formats a P&L value with sign prefix.
 */
export function formatPnlValue(
  value: number,
  percentage: boolean
): string {
  const absValue = Math.abs(value);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";

  if (percentage) {
    return `${sign}${absValue.toFixed(2)}%`;
  }

  const formatted = absValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${sign}$${formatted}`;
}
