import { useState } from "react";
import { SymbolSelector } from "./components/SymbolSelector";
import { DateRangePicker } from "./components/DateRangePicker";
import { LimitsTable } from "./components/LimitsTable";
import { PercentileLimitsTable } from "./components/PercentileLimitsTable";
import { FileUpload } from "./components/FileUpload";
import { parseExcelFile } from "./utils/excelParser";
import type { ScreenerData, SymbolInfo, LimitType } from "./types";
import "./App.css";

function App() {
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [data, setData] = useState<ScreenerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateMode, setDateMode] = useState<"single" | "range" | "multi">("single");
  const [visibleLimits, setVisibleLimits] = useState<LimitType[]>([
    "neverLost",
    "onePercent",
  ]);
  const [viewMode, setViewMode] = useState<"historical" | "probability">("historical");

  const handleFileLoaded = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSelectedSymbol(null);
    setSelectedDates([]);

    try {
      const result = await parseExcelFile(file);
      setSymbols(result.symbols);
      setData(result.data);
      setCurrentFile(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSelectedDates([]);
  };

  const handleToggleLimit = (limit: LimitType) => {
    setVisibleLimits((prev) =>
      prev.includes(limit) ? prev.filter((l) => l !== limit) : [...prev, limit]
    );
  };

  const symbolData = selectedSymbol && data ? data[selectedSymbol] : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Options Strike Screener</h1>
        <p className="subtitle">
          Upload your daily Excel file to find optimal strike prices
        </p>
      </header>

      <main className="app-main">
        <section className="controls-section">
          <FileUpload
            onFileLoaded={handleFileLoaded}
            isLoading={isLoading}
            currentFile={currentFile}
          />

          {error && <div className="error-message">{error}</div>}

          {data && (
            <>
              <div className="control-group">
                <SymbolSelector
                  symbols={symbols}
                  selectedSymbol={selectedSymbol}
                  onSelect={handleSymbolSelect}
                />
              </div>

              {symbolData && (
                <>
                  <div className="symbol-info">
                    <div className="info-item">
                      <span className="info-label">Prior Close</span>
                      <span className="info-value">
                        ${symbolData.metadata.priorClose?.toFixed(2) ?? "-"}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Signal</span>
                      <span className="info-value signal">
                        {symbolData.metadata.signal?.toFixed(4) ?? "-"}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Category</span>
                      <span className="info-value">{symbolData.categoryName}</span>
                    </div>
                  </div>

                  <div className="control-group">
                    <DateRangePicker
                      expirations={symbolData.expirations}
                      selectedDates={selectedDates}
                      onSelect={setSelectedDates}
                      mode={dateMode}
                      onModeChange={setDateMode}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section className="results-section">
          {!data ? (
            <div className="placeholder">
              <p>Upload an Excel file to get started</p>
            </div>
          ) : !symbolData ? (
            <div className="placeholder">
              <p>Select a symbol to view strike limits</p>
            </div>
          ) : (
            <>
              <div className="view-mode-toggle">
                <button
                  className={`view-toggle-btn ${viewMode === "historical" ? "active" : ""}`}
                  onClick={() => setViewMode("historical")}
                >
                  Historical Frequency
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === "probability" ? "active" : ""}`}
                  onClick={() => setViewMode("probability")}
                >
                  Probability Limits
                </button>
              </div>

              {viewMode === "historical" ? (
                <LimitsTable
                  expirations={symbolData.expirations}
                  selectedDates={selectedDates}
                  priorClose={symbolData.metadata.priorClose}
                  visibleLimits={visibleLimits}
                  onToggleLimit={handleToggleLimit}
                />
              ) : (
                <PercentileLimitsTable
                  expirations={symbolData.expirations}
                  selectedDates={selectedDates}
                  priorClose={symbolData.metadata.priorClose}
                />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
