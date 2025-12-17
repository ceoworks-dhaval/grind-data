import type { ExpirationData } from "../types";
import "./DateRangePicker.css";

interface Props {
  expirations: ExpirationData[];
  selectedDates: string[];
  onSelect: (dates: string[]) => void;
  mode: "single" | "range" | "multi";
  onModeChange: (mode: "single" | "range" | "multi") => void;
}

export function DateRangePicker({
  expirations,
  selectedDates,
  onSelect,
  mode,
  onModeChange,
}: Props) {
  const handleDateClick = (date: string) => {
    if (mode === "single") {
      onSelect([date]);
    } else if (mode === "multi") {
      if (selectedDates.includes(date)) {
        onSelect(selectedDates.filter((d) => d !== date));
      } else {
        onSelect([...selectedDates, date].sort());
      }
    } else if (mode === "range") {
      if (selectedDates.length === 0 || selectedDates.length === 2) {
        onSelect([date]);
      } else {
        const [start] = selectedDates;
        const dates = expirations
          .map((e) => e.expiration)
          .filter((d) => {
            if (date > start) {
              return d >= start && d <= date;
            } else {
              return d >= date && d <= start;
            }
          });
        onSelect(dates.sort());
      }
    }
  };

  const isSelected = (date: string) => selectedDates.includes(date);

  const isInRange = (_date: string) => {
    if (mode !== "range" || selectedDates.length !== 1) return false;
    return false;
  };

  return (
    <div className="date-picker">
      <div className="date-picker-header">
        <label>Expiration Dates</label>
        <div className="mode-selector">
          <button
            className={mode === "single" ? "active" : ""}
            onClick={() => {
              onModeChange("single");
              onSelect(selectedDates.slice(0, 1));
            }}
          >
            Single
          </button>
          <button
            className={mode === "range" ? "active" : ""}
            onClick={() => {
              onModeChange("range");
              onSelect([]);
            }}
          >
            Range
          </button>
          <button
            className={mode === "multi" ? "active" : ""}
            onClick={() => onModeChange("multi")}
          >
            Multi
          </button>
        </div>
      </div>

      <div className="date-grid">
        {expirations.map((exp) => (
          <button
            key={exp.expiration}
            className={`date-chip ${isSelected(exp.expiration) ? "selected" : ""} ${
              isInRange(exp.expiration) ? "in-range" : ""
            }`}
            onClick={() => handleDateClick(exp.expiration)}
          >
            <span className="date-value">
              {new Date(exp.expiration + "T00:00:00").toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                }
              )}
            </span>
            <span className="days-to-expiry">{exp.daysToExpiry}d</span>
          </button>
        ))}
      </div>

      {selectedDates.length > 0 && (
        <div className="selection-summary">
          Selected: {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""}
          {selectedDates.length > 0 && (
            <button className="clear-btn" onClick={() => onSelect([])}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
