import * as XLSX from "xlsx";
import type { ScreenerData, SymbolInfo, SymbolData, ExpirationData } from "../types";

function parseSheet(worksheet: XLSX.WorkSheet, sheetName: string): SymbolData | null {
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

  if (data.length < 6) return null;

  // Extract metadata from header rows
  const row1 = data[1] || [];
  const row3 = data[3] || [];

  const metadata = {
    symbol: sheetName,
    priorClose: typeof row1[19] === "number" ? row1[19] : null,
    signal: typeof row1[20] === "number" ? row1[20] : null,
    todayDate: row1[22] ? String(row1[22]).slice(0, 10) : null,
    pd1PercentLL: typeof row1[17] === "number" ? row1[17] : null,
    pd1PercentUL: typeof row1[18] === "number" ? row1[18] : null,
  };

  const categoryName = row3[2] ? String(row3[2]) : "Never Lost";

  // Parse data rows (starting from row 5, index 5)
  const expirations: ExpirationData[] = [];

  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    // Parse expiration date
    let expDateStr: string;
    const expDate = row[0];
    if (typeof expDate === "number") {
      // Excel serial date
      const date = XLSX.SSF.parse_date_code(expDate);
      expDateStr = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    } else if (expDate instanceof Date) {
      expDateStr = expDate.toISOString().slice(0, 10);
    } else {
      expDateStr = String(expDate).slice(0, 10);
    }

    const daysToExpiry = typeof row[1] === "number" ? row[1] : null;
    if (daysToExpiry === null) continue;

    const getNum = (val: unknown): number | null =>
      typeof val === "number" ? val : null;

    const expData: ExpirationData = {
      expiration: expDateStr,
      daysToExpiry,
      limits: {
        neverLost: { lower: getNum(row[2]), upper: getNum(row[3]) },
        every10Years: { lower: getNum(row[4]), upper: getNum(row[5]) },
        every5Years: { lower: getNum(row[6]), upper: getNum(row[7]) },
        every2_5Years: { lower: getNum(row[8]), upper: getNum(row[9]) },
        every1Year: { lower: getNum(row[10]), upper: getNum(row[11]) },
        every6Months: { lower: getNum(row[12]), upper: getNum(row[13]) },
        onePercent: { lower: getNum(row[14]), upper: getNum(row[15]) },
      },
      screeningLimits: {
        neverLost: { lower: getNum(row[17]), upper: getNum(row[18]) },
        onePercent: { lower: getNum(row[19]), upper: getNum(row[20]) },
      },
      percentileLimits: {},
    };

    // Parse percentile limits
    const percentiles = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45];
    percentiles.forEach((pct, idx) => {
      const lowerCol = 23 + idx * 2;
      const upperCol = 24 + idx * 2;
      expData.percentileLimits[String(pct)] = {
        lower: getNum(row[lowerCol]),
        upper: getNum(row[upperCol]),
      };
    });

    // Median
    if (typeof row[41] === "number") {
      expData.median = row[41];
    }

    expirations.push(expData);
  }

  if (expirations.length === 0) return null;

  return { metadata, categoryName, expirations };
}

export async function parseExcelFile(
  file: File
): Promise<{ symbols: SymbolInfo[]; data: ScreenerData }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        const symbols: SymbolInfo[] = [];
        const data: ScreenerData = {};

        // Parse Symbol List sheet first
        if (workbook.SheetNames.includes("Symbol List")) {
          const symbolSheet = workbook.Sheets["Symbol List"];
          const symbolRows = XLSX.utils.sheet_to_json(symbolSheet) as Array<{
            Symbol?: string;
            "Symbol Description"?: string;
          }>;

          symbolRows.forEach((row) => {
            if (row.Symbol) {
              symbols.push({
                symbol: String(row.Symbol),
                description: row["Symbol Description"]
                  ? String(row["Symbol Description"])
                  : "",
              });
            }
          });
        }

        // Parse each symbol sheet
        workbook.SheetNames.forEach((sheetName) => {
          if (sheetName === "Symbol List") return;

          const worksheet = workbook.Sheets[sheetName];
          const symbolData = parseSheet(worksheet, sheetName);

          if (symbolData) {
            data[sheetName] = symbolData;

            // Add to symbols list if not already there
            if (!symbols.find((s) => s.symbol === sheetName)) {
              symbols.push({ symbol: sheetName, description: "" });
            }
          }
        });

        resolve({ symbols, data });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
