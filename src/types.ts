export interface LimitPair {
  lower: number | null;
  upper: number | null;
}

export interface Limits {
  neverLost: LimitPair;
  every10Years: LimitPair;
  every5Years: LimitPair;
  every2_5Years: LimitPair;
  every1Year: LimitPair;
  every6Months: LimitPair;
  onePercent: LimitPair;
}

export interface ScreeningLimits {
  neverLost: LimitPair;
  onePercent: LimitPair;
}

export interface PercentileLimits {
  [key: string]: LimitPair;
}

export interface ExpirationData {
  expiration: string;
  daysToExpiry: number;
  limits: Limits;
  screeningLimits: ScreeningLimits;
  percentileLimits: PercentileLimits;
  median?: number;
}

export interface SymbolMetadata {
  symbol: string;
  priorClose: number | null;
  signal: number | null;
  todayDate: string | null;
  pd1PercentLL: number | null;
  pd1PercentUL: number | null;
}

export interface SymbolData {
  metadata: SymbolMetadata;
  categoryName: string;
  expirations: ExpirationData[];
}

export interface ScreenerData {
  [symbol: string]: SymbolData;
}

export interface SymbolInfo {
  symbol: string;
  description: string;
}

export type LimitType = keyof Limits;

export const LIMIT_LABELS: Record<LimitType, string> = {
  neverLost: "Never Lost",
  every10Years: "Every 10 Years",
  every5Years: "Every 5 Years",
  every2_5Years: "Every 2.5 Years",
  every1Year: "Every 1 Year",
  every6Months: "Every 6 Months",
  onePercent: "1% Raw",
};
