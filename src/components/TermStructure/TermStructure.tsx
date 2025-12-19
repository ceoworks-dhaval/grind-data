import { useState } from "react";
import type { ExpirationData } from "../../types";
import { TermStructureChart } from "./TermStructureChart";
import { TermStructureTable } from "./TermStructureTable";
import "./TermStructure.css";

interface Props {
  expirations: ExpirationData[];
  priorClose: number | null;
}

const PERCENTILES = [
  { key: "0.05", label: "5%" },
  { key: "0.1", label: "10%" },
  { key: "0.15", label: "15%" },
  { key: "0.2", label: "20%" },
  { key: "0.25", label: "25%" },
  { key: "0.3", label: "30%" },
  { key: "0.35", label: "35%" },
  { key: "0.4", label: "40%" },
  { key: "0.45", label: "45%" },
];

export function TermStructure({ expirations, priorClose }: Props) {
  const [selectedPercentile, setSelectedPercentile] = useState("0.1");

  // Sort expirations by DTE
  const sortedExpirations = [...expirations].sort(
    (a, b) => a.daysToExpiry - b.daysToExpiry
  );

  if (sortedExpirations.length === 0) {
    return (
      <div className="term-empty">
        <div className="term-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 12l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p>No expiration data available for term structure analysis</p>
      </div>
    );
  }

  return (
    <div className="term-container">
      <div className="term-header">
        <h3>Term Structure Analysis</h3>
        <p className="term-description">
          See how price boundaries expand as time to expiration increases
        </p>
      </div>

      <div className="term-percentile-selector">
        <span className="term-selector-label">Probability Level:</span>
        <div className="term-percentile-buttons">
          {PERCENTILES.map(({ key, label }) => (
            <button
              key={key}
              className={`term-percentile-btn ${selectedPercentile === key ? "active" : ""}`}
              onClick={() => setSelectedPercentile(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <TermStructureChart
        expirations={sortedExpirations}
        priorClose={priorClose}
        selectedPercentile={selectedPercentile}
      />

      <TermStructureTable
        expirations={sortedExpirations}
        priorClose={priorClose}
        selectedPercentile={selectedPercentile}
      />
    </div>
  );
}
