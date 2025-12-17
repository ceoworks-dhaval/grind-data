#!/usr/bin/env python3
"""
Convert Excel screener data to JSON format for the web app.
Usage: python convert_excel.py <input.xlsx> <output_dir>
"""

import pandas as pd
import json
import sys
import os
from datetime import datetime

def parse_sheet(df, symbol):
    """Parse a single symbol sheet into structured data."""

    # Extract metadata from header rows
    metadata = {
        "symbol": symbol,
        "priorClose": float(df.iloc[1, 19]) if pd.notna(df.iloc[1, 19]) else None,
        "signal": float(df.iloc[1, 20]) if pd.notna(df.iloc[1, 20]) else None,
        "todayDate": str(df.iloc[1, 22])[:10] if pd.notna(df.iloc[1, 22]) else None,
        "pd1PercentLL": float(df.iloc[1, 17]) if pd.notna(df.iloc[1, 17]) else None,
        "pd1PercentUL": float(df.iloc[1, 18]) if pd.notna(df.iloc[1, 18]) else None,
    }

    # Get category name from row 3 (e.g., "Never Lost Since Data Start")
    category_name = str(df.iloc[3, 2]) if pd.notna(df.iloc[3, 2]) else "Never Lost"

    # Parse data rows (starting from row 5)
    expirations = []
    for row_idx in range(5, len(df)):
        row = df.iloc[row_idx]

        # Skip if no expiration date
        if pd.isna(row[0]):
            continue

        exp_date = row[0]
        if isinstance(exp_date, datetime):
            exp_date_str = exp_date.strftime("%Y-%m-%d")
        else:
            exp_date_str = str(exp_date)[:10]

        days_to_expiry = int(row[1]) if pd.notna(row[1]) else None

        if days_to_expiry is None:
            continue

        exp_data = {
            "expiration": exp_date_str,
            "daysToExpiry": days_to_expiry,
            "limits": {
                "neverLost": {
                    "lower": float(row[2]) if pd.notna(row[2]) else None,
                    "upper": float(row[3]) if pd.notna(row[3]) else None,
                },
                "every10Years": {
                    "lower": float(row[4]) if pd.notna(row[4]) else None,
                    "upper": float(row[5]) if pd.notna(row[5]) else None,
                },
                "every5Years": {
                    "lower": float(row[6]) if pd.notna(row[6]) else None,
                    "upper": float(row[7]) if pd.notna(row[7]) else None,
                },
                "every2_5Years": {
                    "lower": float(row[8]) if pd.notna(row[8]) else None,
                    "upper": float(row[9]) if pd.notna(row[9]) else None,
                },
                "every1Year": {
                    "lower": float(row[10]) if pd.notna(row[10]) else None,
                    "upper": float(row[11]) if pd.notna(row[11]) else None,
                },
                "every6Months": {
                    "lower": float(row[12]) if pd.notna(row[12]) else None,
                    "upper": float(row[13]) if pd.notna(row[13]) else None,
                },
                "onePercent": {
                    "lower": float(row[14]) if pd.notna(row[14]) else None,
                    "upper": float(row[15]) if pd.notna(row[15]) else None,
                },
            },
            "screeningLimits": {
                "neverLost": {
                    "lower": float(row[17]) if pd.notna(row[17]) else None,
                    "upper": float(row[18]) if pd.notna(row[18]) else None,
                },
                "onePercent": {
                    "lower": float(row[19]) if pd.notna(row[19]) else None,
                    "upper": float(row[20]) if pd.notna(row[20]) else None,
                },
            },
            "percentileLimits": {}
        }

        # Parse percentile limits (columns 23-40, pairs for 0.05, 0.1, ..., 0.45)
        percentiles = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45]
        for i, pct in enumerate(percentiles):
            lower_col = 23 + (i * 2)
            upper_col = 24 + (i * 2)
            if lower_col < len(row) and upper_col < len(row):
                exp_data["percentileLimits"][str(pct)] = {
                    "lower": float(row[lower_col]) if pd.notna(row[lower_col]) else None,
                    "upper": float(row[upper_col]) if pd.notna(row[upper_col]) else None,
                }

        # Median (column 41)
        if len(row) > 41 and pd.notna(row[41]):
            exp_data["median"] = float(row[41])

        expirations.append(exp_data)

    return {
        "metadata": metadata,
        "categoryName": category_name,
        "expirations": expirations
    }


def convert_excel_to_json(input_file, output_dir):
    """Convert Excel file to JSON files."""

    print(f"Reading {input_file}...")
    xl = pd.ExcelFile(input_file)

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Parse Symbol List sheet
    symbol_list_df = pd.read_excel(input_file, sheet_name="Symbol List")
    symbols = []
    for _, row in symbol_list_df.iterrows():
        if pd.notna(row["Symbol"]):
            symbols.append({
                "symbol": str(row["Symbol"]),
                "description": str(row["Symbol Description"]) if pd.notna(row["Symbol Description"]) else ""
            })

    # Save symbol list
    with open(os.path.join(output_dir, "symbols.json"), "w") as f:
        json.dump(symbols, f)
    print(f"Saved symbols.json with {len(symbols)} symbols")

    # Parse each symbol sheet
    all_data = {}
    skipped = []

    for sheet_name in xl.sheet_names:
        if sheet_name == "Symbol List":
            continue

        try:
            df = pd.read_excel(input_file, sheet_name=sheet_name, header=None)
            symbol_data = parse_sheet(df, sheet_name)
            all_data[sheet_name] = symbol_data
        except Exception as e:
            skipped.append((sheet_name, str(e)))
            print(f"  Skipped {sheet_name}: {e}")

    # Save all data to a single file
    with open(os.path.join(output_dir, "screener_data.json"), "w") as f:
        json.dump(all_data, f)

    print(f"\nConverted {len(all_data)} symbols")
    print(f"Skipped {len(skipped)} sheets")
    print(f"Output saved to {output_dir}/screener_data.json")

    # Also save metadata summary
    summary = {
        "generatedAt": datetime.now().isoformat(),
        "sourceFile": os.path.basename(input_file),
        "symbolCount": len(all_data),
        "symbols": list(all_data.keys())
    }
    with open(os.path.join(output_dir, "metadata.json"), "w") as f:
        json.dump(summary, f, indent=2)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python convert_excel.py <input.xlsx> [output_dir]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "./public/data"

    convert_excel_to_json(input_file, output_dir)
