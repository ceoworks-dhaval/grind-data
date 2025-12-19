import { useRef, useEffect, useState, useCallback } from "react";
import type { ExpirationData } from "../../types";

interface Props {
  expirations: ExpirationData[];
  priorClose: number | null;
  selectedPercentile: string;
}

interface ChartPoint {
  dte: number;
  lower: number | null;
  upper: number | null;
  median: number | null;
  expiration: string;
}

interface TooltipData {
  x: number;
  y: number;
  dte: number;
  expiration: string;
  lower: number | null;
  upper: number | null;
  median: number | null;
  priorClose: number | null;
}

const CHART_PADDING = { top: 40, right: 60, bottom: 50, left: 80 };
const PUT_COLOR = "#bf4800";
const CALL_COLOR = "#007a3d";
const MEDIAN_COLOR = "#6366f1";

function formatPrice(value: number | null): string {
  if (value === null) return "—";
  return "$" + value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null, base: number | null): string {
  if (value === null || base === null || base === 0) return "";
  const pct = ((value - base) / base) * 100;
  return `(${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;
}

export function TermStructureChart({
  expirations,
  priorClose,
  selectedPercentile,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });

  // Transform data for chart
  const chartData: ChartPoint[] = expirations.map((exp) => ({
    dte: exp.daysToExpiry,
    lower: exp.percentileLimits[selectedPercentile]?.lower ?? null,
    upper: exp.percentileLimits[selectedPercentile]?.upper ?? null,
    median: exp.median ?? null,
    expiration: exp.expiration,
  }));

  // Calculate chart bounds
  const maxDTE = Math.max(...chartData.map((d) => d.dte), 1);
  const allValues = chartData.flatMap((d) => [d.lower, d.upper, d.median].filter((v) => v !== null)) as number[];
  const minPrice = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxPrice = allValues.length > 0 ? Math.max(...allValues) : 100;
  const priceRange = maxPrice - minPrice || 1;
  const paddedMin = minPrice - priceRange * 0.05;
  const paddedMax = maxPrice + priceRange * 0.05;

  // Resize handler
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(400, width), height: 300 });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Scale functions
  const scaleX = useCallback(
    (dte: number) => {
      const chartWidth = dimensions.width - CHART_PADDING.left - CHART_PADDING.right;
      return CHART_PADDING.left + (dte / maxDTE) * chartWidth;
    },
    [dimensions.width, maxDTE]
  );

  const scaleY = useCallback(
    (price: number) => {
      const chartHeight = dimensions.height - CHART_PADDING.top - CHART_PADDING.bottom;
      return CHART_PADDING.top + chartHeight - ((price - paddedMin) / (paddedMax - paddedMin)) * chartHeight;
    },
    [dimensions.height, paddedMin, paddedMax]
  );

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
    ctx.fillRect(
      CHART_PADDING.left,
      CHART_PADDING.top,
      dimensions.width - CHART_PADDING.left - CHART_PADDING.right,
      dimensions.height - CHART_PADDING.top - CHART_PADDING.bottom
    );

    // Draw prior close reference line
    if (priorClose !== null) {
      const y = scaleY(priorClose);
      ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(CHART_PADDING.left, y);
      ctx.lineTo(dimensions.width - CHART_PADDING.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = "rgba(99, 102, 241, 0.7)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText("Close", CHART_PADDING.left - 8, y + 4);
    }

    // Filter valid points
    const validPoints = chartData.filter(
      (d) => d.lower !== null && d.upper !== null
    );

    if (validPoints.length < 2) {
      ctx.fillStyle = "#666";
      ctx.font = "14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(
        "Not enough data points to render chart",
        dimensions.width / 2,
        dimensions.height / 2
      );
      return;
    }

    // Draw filled cone area
    ctx.beginPath();
    ctx.moveTo(scaleX(validPoints[0].dte), scaleY(validPoints[0].upper!));
    for (const point of validPoints) {
      ctx.lineTo(scaleX(point.dte), scaleY(point.upper!));
    }
    for (let i = validPoints.length - 1; i >= 0; i--) {
      ctx.lineTo(scaleX(validPoints[i].dte), scaleY(validPoints[i].lower!));
    }
    ctx.closePath();

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, CHART_PADDING.top, 0, dimensions.height - CHART_PADDING.bottom);
    gradient.addColorStop(0, "rgba(0, 122, 61, 0.08)");
    gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.03)");
    gradient.addColorStop(1, "rgba(191, 72, 0, 0.08)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw upper line (call boundary)
    ctx.strokeStyle = CALL_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    validPoints.forEach((point, i) => {
      const x = scaleX(point.dte);
      const y = scaleY(point.upper!);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw lower line (put boundary)
    ctx.strokeStyle = PUT_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    validPoints.forEach((point, i) => {
      const x = scaleX(point.dte);
      const y = scaleY(point.lower!);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw median line (dashed)
    const medianPoints = chartData.filter((d) => d.median !== null);
    if (medianPoints.length >= 2) {
      ctx.strokeStyle = MEDIAN_COLOR;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      medianPoints.forEach((point, i) => {
        const x = scaleX(point.dte);
        const y = scaleY(point.median!);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw data points
    validPoints.forEach((point) => {
      const x = scaleX(point.dte);

      // Upper point
      ctx.fillStyle = CALL_COLOR;
      ctx.beginPath();
      ctx.arc(x, scaleY(point.upper!), 4, 0, Math.PI * 2);
      ctx.fill();

      // Lower point
      ctx.fillStyle = PUT_COLOR;
      ctx.beginPath();
      ctx.arc(x, scaleY(point.lower!), 4, 0, Math.PI * 2);
      ctx.fill();

      // Median point
      if (point.median !== null) {
        ctx.fillStyle = MEDIAN_COLOR;
        ctx.beginPath();
        ctx.arc(x, scaleY(point.median), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Y-axis labels
    ctx.fillStyle = "#666";
    ctx.font = "11px system-ui";
    ctx.textAlign = "right";
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const price = paddedMin + (paddedMax - paddedMin) * (i / yTicks);
      const y = scaleY(price);
      ctx.fillText(price.toFixed(0), CHART_PADDING.left - 10, y + 4);

      // Grid line
      ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CHART_PADDING.left, y);
      ctx.lineTo(dimensions.width - CHART_PADDING.right, y);
      ctx.stroke();
    }

    // X-axis labels
    ctx.textAlign = "center";
    const xTicks = Math.min(6, validPoints.length);
    for (let i = 0; i <= xTicks; i++) {
      const dte = Math.round((maxDTE * i) / xTicks);
      const x = scaleX(dte);
      ctx.fillText(`${dte}d`, x, dimensions.height - CHART_PADDING.bottom + 20);
    }

    // Axis labels
    ctx.font = "12px system-ui";
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    ctx.fillText("Days to Expiration", dimensions.width / 2, dimensions.height - 10);

    ctx.save();
    ctx.translate(15, dimensions.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Price", 0, 0);
    ctx.restore();

    // Legend
    const legendY = 15;
    const legendX = CHART_PADDING.left + 10;

    ctx.font = "11px system-ui";
    ctx.textAlign = "left";

    // Call legend
    ctx.fillStyle = CALL_COLOR;
    ctx.beginPath();
    ctx.arc(legendX, legendY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("Call Boundary", legendX + 10, legendY + 4);

    // Put legend
    ctx.fillStyle = PUT_COLOR;
    ctx.beginPath();
    ctx.arc(legendX + 110, legendY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("Put Boundary", legendX + 120, legendY + 4);

    // Median legend
    ctx.fillStyle = MEDIAN_COLOR;
    ctx.beginPath();
    ctx.arc(legendX + 210, legendY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("Median", legendX + 220, legendY + 4);
  }, [chartData, dimensions, priorClose, scaleX, scaleY, paddedMin, paddedMax, maxDTE]);

  // Mouse move handler for tooltip
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Find nearest point
      const chartWidth = dimensions.width - CHART_PADDING.left - CHART_PADDING.right;
      const relX = x - CHART_PADDING.left;

      if (relX < 0 || relX > chartWidth) {
        setTooltip(null);
        return;
      }

      const dte = (relX / chartWidth) * maxDTE;

      // Find closest data point
      let closest: ChartPoint | null = null;
      let minDist = Infinity;

      for (const point of chartData) {
        const dist = Math.abs(point.dte - dte);
        if (dist < minDist) {
          minDist = dist;
          closest = point;
        }
      }

      if (closest && minDist < maxDTE * 0.1) {
        setTooltip({
          x: scaleX(closest.dte),
          y,
          dte: closest.dte,
          expiration: closest.expiration,
          lower: closest.lower,
          upper: closest.upper,
          median: closest.median,
          priorClose,
        });
      } else {
        setTooltip(null);
      }
    },
    [chartData, dimensions.width, maxDTE, priorClose, scaleX]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="term-chart-section" ref={containerRef}>
      <div className="term-chart-container">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: tooltip ? "crosshair" : "default" }}
        />
        {tooltip && (
          <div
            className="term-chart-tooltip"
            style={{
              left: Math.min(tooltip.x + 10, dimensions.width - 180),
              top: Math.max(tooltip.y - 80, 10),
            }}
          >
            <div className="term-tooltip-header">
              {new Date(tooltip.expiration + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              <span className="term-tooltip-dte">{tooltip.dte} DTE</span>
            </div>
            <div className="term-tooltip-row call">
              <span>Call:</span>
              <span>
                {formatPrice(tooltip.upper)}{" "}
                <span className="term-tooltip-pct">{formatPercent(tooltip.upper, tooltip.priorClose)}</span>
              </span>
            </div>
            <div className="term-tooltip-row put">
              <span>Put:</span>
              <span>
                {formatPrice(tooltip.lower)}{" "}
                <span className="term-tooltip-pct">{formatPercent(tooltip.lower, tooltip.priorClose)}</span>
              </span>
            </div>
            {tooltip.median !== null && (
              <div className="term-tooltip-row median">
                <span>Median:</span>
                <span>
                  {formatPrice(tooltip.median)}{" "}
                  <span className="term-tooltip-pct">{formatPercent(tooltip.median, tooltip.priorClose)}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
