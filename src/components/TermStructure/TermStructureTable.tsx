import type { ExpirationData } from "../../types";

interface Props {
  expirations: ExpirationData[];
  priorClose: number | null;
  selectedPercentile: string;
}

// Target DTEs to show in columns
const TARGET_DTES = [7, 14, 21, 30, 45, 60];

function formatPrice(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null, base: number | null): string {
  if (value === null || base === null || base === 0) return "—";
  const pct = ((value - base) / base) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function findNearestExpiration(
  expirations: ExpirationData[],
  targetDTE: number
): ExpirationData | null {
  if (expirations.length === 0) return null;

  // Find the expiration closest to the target DTE
  let nearest = expirations[0];
  let minDiff = Math.abs(expirations[0].daysToExpiry - targetDTE);

  for (const exp of expirations) {
    const diff = Math.abs(exp.daysToExpiry - targetDTE);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = exp;
    }
  }

  // Only return if within reasonable range (±5 days or 50% of target)
  if (minDiff <= Math.max(5, targetDTE * 0.5)) {
    return nearest;
  }
  return null;
}

export function TermStructureTable({
  expirations,
  priorClose,
  selectedPercentile,
}: Props) {
  // Find nearest expirations for each target DTE
  const dteData = TARGET_DTES.map((targetDTE) => {
    const exp = findNearestExpiration(expirations, targetDTE);
    if (!exp) {
      return { targetDTE, actualDTE: null, exp: null };
    }
    return {
      targetDTE,
      actualDTE: exp.daysToExpiry,
      exp,
    };
  }).filter((d) => d.exp !== null);

  if (dteData.length === 0) {
    return (
      <div className="term-table-empty">
        <p>No expirations available for comparison</p>
      </div>
    );
  }

  return (
    <div className="term-table-section">
      <h4 className="term-table-title">DTE Comparison</h4>
      <div className="term-table-wrapper">
        <table className="term-table">
          <thead>
            <tr>
              <th className="term-table-label-col">Metric</th>
              {dteData.map(({ actualDTE }) => (
                <th key={actualDTE} className="term-table-dte-col">
                  {actualDTE}d
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Put Strike Row */}
            <tr>
              <td className="term-table-label">Put Strike</td>
              {dteData.map(({ actualDTE, exp }) => {
                const lower = exp?.percentileLimits[selectedPercentile]?.lower ?? null;
                return (
                  <td key={actualDTE} className="term-table-value put">
                    {formatPrice(lower)}
                  </td>
                );
              })}
            </tr>

            {/* Put % Change Row */}
            <tr className="term-table-pct-row">
              <td className="term-table-label">% from Close</td>
              {dteData.map(({ actualDTE, exp }) => {
                const lower = exp?.percentileLimits[selectedPercentile]?.lower ?? null;
                return (
                  <td key={actualDTE} className="term-table-value put-pct">
                    {formatPercent(lower, priorClose)}
                  </td>
                );
              })}
            </tr>

            {/* Call Strike Row */}
            <tr>
              <td className="term-table-label">Call Strike</td>
              {dteData.map(({ actualDTE, exp }) => {
                const upper = exp?.percentileLimits[selectedPercentile]?.upper ?? null;
                return (
                  <td key={actualDTE} className="term-table-value call">
                    {formatPrice(upper)}
                  </td>
                );
              })}
            </tr>

            {/* Call % Change Row */}
            <tr className="term-table-pct-row">
              <td className="term-table-label">% from Close</td>
              {dteData.map(({ actualDTE, exp }) => {
                const upper = exp?.percentileLimits[selectedPercentile]?.upper ?? null;
                return (
                  <td key={actualDTE} className="term-table-value call-pct">
                    {formatPercent(upper, priorClose)}
                  </td>
                );
              })}
            </tr>

            {/* Divider */}
            <tr className="term-table-divider">
              <td colSpan={dteData.length + 1}></td>
            </tr>

            {/* Range Width Row */}
            <tr>
              <td className="term-table-label">Range Width</td>
              {dteData.map(({ actualDTE, exp }) => {
                const lower = exp?.percentileLimits[selectedPercentile]?.lower ?? null;
                const upper = exp?.percentileLimits[selectedPercentile]?.upper ?? null;
                const width = lower !== null && upper !== null ? upper - lower : null;
                return (
                  <td key={actualDTE} className="term-table-value range">
                    {formatPrice(width)}
                  </td>
                );
              })}
            </tr>

            {/* Range % Row */}
            <tr className="term-table-pct-row">
              <td className="term-table-label">Range %</td>
              {dteData.map(({ actualDTE, exp }) => {
                const lower = exp?.percentileLimits[selectedPercentile]?.lower ?? null;
                const upper = exp?.percentileLimits[selectedPercentile]?.upper ?? null;
                if (lower === null || upper === null || priorClose === null || priorClose === 0) {
                  return (
                    <td key={actualDTE} className="term-table-value range-pct">
                      —
                    </td>
                  );
                }
                const widthPct = ((upper - lower) / priorClose) * 100;
                return (
                  <td key={actualDTE} className="term-table-value range-pct">
                    {widthPct.toFixed(1)}%
                  </td>
                );
              })}
            </tr>

            {/* Median Row */}
            <tr>
              <td className="term-table-label">Median</td>
              {dteData.map(({ actualDTE, exp }) => {
                return (
                  <td key={actualDTE} className="term-table-value median">
                    {formatPrice(exp?.median ?? null)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
