import type { ExpirationData } from "../types";
import "./PercentileLimitsTable.css";

interface Props {
  expirations: ExpirationData[];
  selectedDates: string[];
  priorClose: number | null;
}

const PERCENTILE_DATA = [
  { key: "0.05", label: "5%", description: "Extreme bounds" },
  { key: "0.1", label: "10%", description: "Wide range" },
  { key: "0.15", label: "15%", description: "" },
  { key: "0.2", label: "20%", description: "" },
  { key: "0.25", label: "25%", description: "Quartile" },
  { key: "0.3", label: "30%", description: "" },
  { key: "0.35", label: "35%", description: "" },
  { key: "0.4", label: "40%", description: "" },
  { key: "0.45", label: "45%", description: "Near median" },
];

function formatPrice(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null, base: number | null): string {
  if (value === null || base === null || base === 0) return "";
  const pct = ((value - base) / base) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function formatDate(dateStr: string): { weekday: string; date: string } {
  const date = new Date(dateStr + "T00:00:00");
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

export function PercentileLimitsTable({
  expirations,
  selectedDates,
  priorClose,
}: Props) {
  const filteredExpirations = expirations.filter((e) =>
    selectedDates.includes(e.expiration)
  );

  if (filteredExpirations.length === 0) {
    return (
      <div className="prob-empty">
        <div className="prob-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 16l4-4 4 4 5-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p>Select expiration dates to view probability limits</p>
      </div>
    );
  }

  return (
    <div className="prob-container">
      {priorClose && (
        <div className="prob-reference">
          <span className="prob-reference-label">Reference Price</span>
          <span className="prob-reference-value">${priorClose.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
      )}

      <div className="prob-grid">
        {filteredExpirations.map((exp) => {
          const { weekday, date } = formatDate(exp.expiration);
          return (
            <div key={exp.expiration} className="prob-card">
              <div className="prob-card-header">
                <div className="prob-card-date">
                  <span className="prob-weekday">{weekday}</span>
                  <span className="prob-date">{date}</span>
                </div>
                <div className="prob-card-dte">
                  <span className="prob-dte-value">{exp.daysToExpiry}</span>
                  <span className="prob-dte-label">DTE</span>
                </div>
              </div>

              {exp.median !== undefined && (
                <div className="prob-median">
                  <span className="prob-median-label">Median</span>
                  <span className="prob-median-value">{formatPrice(exp.median)}</span>
                  <span className="prob-median-pct">{formatPercent(exp.median, priorClose)}</span>
                </div>
              )}

              <div className="prob-table">
                <div className="prob-table-header">
                  <span className="prob-col-level">Level</span>
                  <span className="prob-col-put">Put Strike</span>
                  <span className="prob-col-call">Call Strike</span>
                </div>

                {PERCENTILE_DATA.map(({ key, label }) => {
                  const limitData = exp.percentileLimits[key];
                  const lower = limitData?.lower ?? null;
                  const upper = limitData?.upper ?? null;

                  return (
                    <div key={key} className="prob-row">
                      <span className="prob-level">{label}</span>
                      <div className="prob-value prob-put">
                        <span className="prob-price">{formatPrice(lower)}</span>
                        <span className="prob-pct">{formatPercent(lower, priorClose)}</span>
                      </div>
                      <div className="prob-value prob-call">
                        <span className="prob-price">{formatPrice(upper)}</span>
                        <span className="prob-pct">{formatPercent(upper, priorClose)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="prob-legend">
        <div className="prob-legend-item">
          <span className="prob-legend-dot prob-legend-put"></span>
          <span>Put = Sell put below this strike</span>
        </div>
        <div className="prob-legend-item">
          <span className="prob-legend-dot prob-legend-call"></span>
          <span>Call = Sell call above this strike</span>
        </div>
      </div>
    </div>
  );
}
