import type { ExpirationData, LimitType } from "../types";
import { LIMIT_LABELS } from "../types";
import "./LimitsTable.css";

interface Props {
  expirations: ExpirationData[];
  selectedDates: string[];
  priorClose: number | null;
  visibleLimits: LimitType[];
  onToggleLimit: (limit: LimitType) => void;
}

const ALL_LIMITS: LimitType[] = [
  "neverLost",
  "every10Years",
  "every5Years",
  "every2_5Years",
  "every1Year",
  "every6Months",
  "onePercent",
];

function formatPrice(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(2);
}

function formatPercent(value: number | null, base: number | null): string {
  if (value === null || base === null || base === 0) return "";
  const pct = ((value - base) / base) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function LimitsTable({
  expirations,
  selectedDates,
  priorClose,
  visibleLimits,
  onToggleLimit,
}: Props) {
  const filteredExpirations = expirations.filter((e) =>
    selectedDates.includes(e.expiration)
  );

  if (filteredExpirations.length === 0) {
    return (
      <div className="limits-table-empty">
        <p>Select one or more expiration dates to view strike limits</p>
      </div>
    );
  }

  return (
    <div className="limits-table-container">
      <div className="limit-toggles">
        <span className="toggle-label">Show limits:</span>
        {ALL_LIMITS.map((limit) => (
          <button
            key={limit}
            className={`limit-toggle ${visibleLimits.includes(limit) ? "active" : ""}`}
            onClick={() => onToggleLimit(limit)}
          >
            {LIMIT_LABELS[limit]}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="limits-table">
          <thead>
            <tr>
              <th className="sticky-col">Expiration</th>
              <th className="sticky-col">DTE</th>
              {visibleLimits.map((limit) => (
                <th key={limit} colSpan={2} className="limit-header">
                  {LIMIT_LABELS[limit]}
                </th>
              ))}
            </tr>
            <tr className="sub-header">
              <th className="sticky-col"></th>
              <th className="sticky-col"></th>
              {visibleLimits.map((limit) => (
                <>
                  <th key={`${limit}-lower`} className="lower">
                    Put
                  </th>
                  <th key={`${limit}-upper`} className="upper">
                    Call
                  </th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredExpirations.map((exp) => (
              <tr key={exp.expiration}>
                <td className="sticky-col date-cell">
                  {new Date(exp.expiration + "T00:00:00").toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }
                  )}
                </td>
                <td className="sticky-col dte-cell">{exp.daysToExpiry}</td>
                {visibleLimits.map((limit) => {
                  const limitData = exp.limits[limit];
                  return (
                    <>
                      <td key={`${limit}-lower`} className="price-cell lower">
                        <span className="price">
                          {formatPrice(limitData.lower)}
                        </span>
                        <span className="percent">
                          {formatPercent(limitData.lower, priorClose)}
                        </span>
                      </td>
                      <td key={`${limit}-upper`} className="price-cell upper">
                        <span className="price">
                          {formatPrice(limitData.upper)}
                        </span>
                        <span className="percent">
                          {formatPercent(limitData.upper, priorClose)}
                        </span>
                      </td>
                    </>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {priorClose && (
        <div className="table-footer">
          <span className="prior-close">
            Prior Close: <strong>${priorClose.toFixed(2)}</strong>
          </span>
          <span className="legend">
            <span className="lower-legend">Put = Lower Limit (sell put below)</span>
            <span className="upper-legend">Call = Upper Limit (sell call above)</span>
          </span>
        </div>
      )}
    </div>
  );
}
