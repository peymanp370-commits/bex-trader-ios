import { useEffect, useMemo, useRef, useState } from "react";

export type ChartTimeframe =
  | "M1"
  | "M5"
  | "M15"
  | "M30"
  | "H1"
  | "H4"
  | "D1"
  | "W1"
  | "MN";

export interface Candle {
  bucket: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isoTime: string;
}

interface CandlestickChartProps {
  candles: Candle[];
  darkMode: boolean;
  timeframe?: ChartTimeframe;
  symbol?: string;
  signalEntry?: number;
  signalSL?: number;
  signalTP?: number;
  loading?: boolean;
  showEMA20?: boolean;
  showEMA50?: boolean;
  showVWAP?: boolean;
  showSessions?: boolean;
}

type HoverState = {
  x: number;
  y: number;
  index: number;
  candle: Candle;
} | null;

const DPR_MAX = 2;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatPrice(value: number, symbol = "XAUUSD") {
  const digits = symbol === "XAGUSD" ? 3 : 2;
  return value.toFixed(digits);
}

function normalizeEpochMs(value: number) {
  return value < 1e12 ? value * 1000 : value;
}


function getSessionName(epochMs: number) {
  const hour = new Date(normalizeEpochMs(epochMs)).getUTCHours();
  if (hour >= 0 && hour < 7) return "ASIA";
  if (hour >= 7 && hour < 13) return "LONDON";
  return "NEW_YORK";
}

function buildEMA(candles: Candle[], period: number) {
  const alpha = 2 / (period + 1);
  let ema = 0;
  return candles.map((candle, index) => {
    if (index === 0) {
      ema = candle.close;
    } else {
      ema = candle.close * alpha + ema * (1 - alpha);
    }
    return { bucket: candle.bucket, value: ema };
  });
}

function buildVWAP(candles: Candle[]) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  return candles.map((candle) => {
    const typical = (candle.high + candle.low + candle.close) / 3;
    const volume = Math.max(1, candle.volume || 0);
    cumulativePV += typical * volume;
    cumulativeVolume += volume;
    return {
      bucket: candle.bucket,
      value: cumulativePV / Math.max(1, cumulativeVolume),
    };
  });
}

function formatAxisTime(epochMs: number, timeframe: ChartTimeframe) {
  const date = new Date(normalizeEpochMs(epochMs));

  if (timeframe === "MN") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  }

  if (timeframe === "W1" || timeframe === "D1") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
  }

  if (timeframe === "H4" || timeframe === "H1") {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTooltipTime(epochMs: number, timeframe: ChartTimeframe) {
  const date = new Date(normalizeEpochMs(epochMs));

  if (timeframe === "MN") {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  if (timeframe === "W1" || timeframe === "D1") {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function CandlestickChart({
  candles,
  darkMode,
  signalEntry,
  signalSL,
  signalTP,
  timeframe = "M15",
  symbol = "XAUUSD",
  loading = false,
  showEMA20 = true,
  showEMA50 = true,
  showVWAP = false,
  showSessions = true,
}: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<number | null>(null);

  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  const [hover, setHover] = useState<HoverState>(null);
  const [isDraggingUi, setIsDraggingUi] = useState(false);

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;

  const initialZoom = isMobile ? 9.8 : 1.45;

  const [zoom, setZoom] = useState(initialZoom);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!candles.length || !isMobile) return;

    const minWindow = Math.min(3, candles.length);
    const maxWindow = candles.length;
    const windowSize = clamp(
      Math.round(candles.length / zoom),
      minWindow,
      maxWindow
    );

    const targetOffset = Math.max(0, candles.length - windowSize + 1);
    setOffset(targetOffset);
  }, [candles.length, zoom, isMobile]);

  const palette = useMemo(
    () => ({
      background: darkMode ? "#060f1c" : "#ffffff",
      border: darkMode ? "#183450" : "#d8e0ea",
      gridMajor: darkMode ? "rgba(114,138,170,0.17)" : "#dce3eb",
      gridMinor: darkMode ? "rgba(114,138,170,0.07)" : "#edf2f7",
      axis: darkMode ? "#8da5c4" : "#64748b",
      axisStrong: darkMode ? "#e1ebfb" : "#334155",
      up: "#20d86d",
      down: "#ff645e",
      wickUp: "#7ef0b0",
      wickDown: "#ffa09c",
      entry: "#f1b300",
      stop: "#ef4444",
      target: "#22c55e",
      crosshair: darkMode
        ? "rgba(210,223,240,0.32)"
        : "rgba(100,116,139,0.30)",
      tooltipBg: darkMode ? "rgba(7,16,28,0.98)" : "rgba(255,255,255,0.98)",
      tooltipText: darkMode ? "#e9f1fc" : "#0f172a",
      tooltipBorder: darkMode ? "#284767" : "#d4dce6",
      volumeUp: darkMode ? "rgba(32,216,109,0.12)" : "rgba(25,211,107,0.10)",
      volumeDown: darkMode ? "rgba(255,100,94,0.12)" : "rgba(255,98,93,0.10)",
      priceLabelBg: darkMode ? "#10233b" : "#ffffff",
      controlBg: darkMode ? "rgba(9,19,35,0.92)" : "rgba(255,255,255,0.92)",
      controlText: darkMode ? "#f8fafc" : "#0f172a",
      controlBorder: darkMode ? "#284767" : "#d5dce6",
      ema20: darkMode ? "#f59e0b" : "#d97706",
      ema50: darkMode ? "#60a5fa" : "#2563eb",
      vwap: darkMode ? "#c084fc" : "#7c3aed",
      sessionAsia: darkMode ? "rgba(56,189,248,0.06)" : "rgba(56,189,248,0.08)",
      sessionLondon: darkMode ? "rgba(250,204,21,0.06)" : "rgba(250,204,21,0.08)",
      sessionNewYork: darkMode ? "rgba(248,113,113,0.06)" : "rgba(248,113,113,0.08)",
    }),
    [darkMode]
  );

  const visibleCandles = useMemo(() => {
    if (!candles.length) return [];

    const minWindow = Math.min(isMobile ? 3 : 28, candles.length);
    const maxWindow = candles.length;

    const windowSize = clamp(
      Math.round(candles.length / zoom),
      minWindow,
      maxWindow
    );

    const rightBreathingCandles = isMobile ? 3.2 : 1.0;
    const maxStart = Math.max(
      0,
      candles.length - windowSize + rightBreathingCandles
    );
    const start = clamp(Math.round(offset), 0, maxStart);
    const end = Math.min(candles.length, start + windowSize);

    return candles.slice(start, end);
  }, [candles, zoom, offset, isMobile]);

  useEffect(() => {
    if (!candles.length) return;

    const minWindow = Math.min(isMobile ? 3 : 28, candles.length);
    const maxWindow = candles.length;
    const windowSize = clamp(
      Math.round(candles.length / zoom),
      minWindow,
      maxWindow
    );
    const rightBreathingCandles = isMobile ? 3.2 : 1.0;
    const maxStart = Math.max(
      0,
      candles.length - windowSize + rightBreathingCandles
    );

    setOffset((prev) => clamp(prev, 0, maxStart));
  }, [candles, zoom, isMobile]);


  const ema20Series = useMemo(
    () => (showEMA20 ? buildEMA(visibleCandles, 20) : []),
    [visibleCandles, showEMA20]
  );

  const ema50Series = useMemo(
    () => (showEMA50 ? buildEMA(visibleCandles, 50) : []),
    [visibleCandles, showEMA50]
  );

  const vwapSeries = useMemo(
    () => (showVWAP ? buildVWAP(visibleCandles) : []),
    [visibleCandles, showVWAP]
  );

  const drawLineSeries = (
    ctx: CanvasRenderingContext2D,
    points: Array<{ value: number }>,
    color: string,
    candleSpacing: number,
    paddingLeft: number,
    priceToY: (price: number) => number
  ) => {
    if (!points.length) return;
    ctx.save();
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = paddingLeft + (index + 0.5) * candleSpacing;
      const y = priceToY(point.value);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    const rect = container.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = isMobile ? 290 : 470;

    if (
      canvas.width !== Math.floor(width * dpr) ||
      canvas.height !== Math.floor(height * dpr)
    ) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padding = isMobile
      ? { top: 18, right: 86, bottom: 22, left: 2 }
      : { top: 22, right: 96, bottom: 44, left: 14 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const volumeHeight = isMobile
      ? 0
      : Math.max(58, Math.floor(chartHeight * 0.16));

    const priceChartHeight = isMobile
      ? chartHeight
      : chartHeight - volumeHeight - 8;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);

    if (!visibleCandles.length) {
      ctx.fillStyle = palette.axis;
      ctx.font = '13px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(
        loading ? "Loading chart..." : "No chart data",
        width / 2,
        height / 2
      );
      return;
    }

    const prices = visibleCandles.flatMap((c) => [c.high, c.low]);
    if (Number.isFinite(signalEntry)) prices.push(signalEntry as number);
    if (Number.isFinite(signalSL)) prices.push(signalSL as number);
    if (Number.isFinite(signalTP)) prices.push(signalTP as number);

    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const rawRange = Math.max(maxPrice - minPrice, 0.0001);
    const pad = rawRange * (isMobile ? 0.06 : 0.08);
    const adjustedMax = maxPrice + pad;
    const adjustedMin = minPrice - pad;
    const adjustedRange = Math.max(adjustedMax - adjustedMin, 0.0001);

    const maxVolume = Math.max(...visibleCandles.map((c) => c.volume || 0), 1);

    const priceToY = (price: number) =>
      padding.top + ((adjustedMax - price) / adjustedRange) * priceChartHeight;

    const volumeToY = (volume: number) =>
      padding.top +
      priceChartHeight +
      8 +
      (1 - volume / maxVolume) * volumeHeight;

    const logicalVisibleCount = visibleCandles.length + (isMobile ? 3.2 : 1.0);
    const candleSpacing = chartWidth / Math.max(logicalVisibleCount, 1);

    const rawCandleWidth = candleSpacing * (isMobile ? 0.9 : 0.64);
    const candleWidth = clamp(
      rawCandleWidth,
      isMobile ? 12 : 4,
      isMobile ? 26 : 16
    );
    const safeCandleWidth = Math.min(candleWidth, candleSpacing * 0.92);

    const wickWidth = isMobile ? 2.6 : safeCandleWidth >= 7 ? 1.4 : 1;

    if (showSessions) {
      let startIndex = 0;
      while (startIndex < visibleCandles.length) {
        const session = getSessionName(visibleCandles[startIndex].bucket);
        let endIndex = startIndex + 1;
        while (
          endIndex < visibleCandles.length &&
          getSessionName(visibleCandles[endIndex].bucket) === session
        ) {
          endIndex += 1;
        }

        const startX = padding.left + startIndex * candleSpacing;
        const endX = padding.left + endIndex * candleSpacing;
        ctx.fillStyle =
          session === "ASIA"
            ? palette.sessionAsia
            : session === "LONDON"
              ? palette.sessionLondon
              : palette.sessionNewYork;
        ctx.fillRect(startX, padding.top, endX - startX, priceChartHeight);
        startIndex = endIndex;
      }
    }

    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, padding.top, chartWidth, priceChartHeight);

    if (!isMobile && volumeHeight > 0) {
      ctx.strokeRect(
        padding.left,
        padding.top + priceChartHeight + 8,
        chartWidth,
        volumeHeight
      );
    }

    const majorLines = 6;
    for (let i = 0; i <= majorLines; i++) {
      const y = padding.top + (priceChartHeight / majorLines) * i;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.strokeStyle = palette.gridMajor;
      ctx.lineWidth = 1;
      ctx.stroke();

      const price = adjustedMax - (adjustedRange / majorLines) * i;
      ctx.fillStyle = palette.axis;
      ctx.font = isMobile
        ? '9px "Segoe UI", Arial, sans-serif'
        : '11px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "left";
      ctx.fillText(
        formatPrice(price, symbol),
        width - padding.right + 10,
        y + 4
      );
    }

    const minorLines = 12;
    for (let i = 0; i <= minorLines; i++) {
      if (i % 2 === 0) continue;
      const y = padding.top + (priceChartHeight / minorLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.strokeStyle = palette.gridMinor;
      ctx.stroke();
    }

    const drawReferenceLine = (
      price: number | undefined,
      label: string,
      color: string
    ) => {
      if (!Number.isFinite(price)) return;
      const y = priceToY(price as number);

      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.restore();

      const text = isMobile
        ? formatPrice(price as number, symbol)
        : `${label} ${formatPrice(price as number, symbol)}`;

      ctx.font = 'bold 10px "Segoe UI", Arial, sans-serif';
      const textW = ctx.measureText(text).width + 12;
      const labelX = width - padding.right + 8;

      ctx.fillStyle = color;
      ctx.fillRect(labelX, y - 10, textW, 18);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(text, labelX + 6, y + 3);
    };

    drawReferenceLine(signalEntry, "ENTRY", palette.entry);
    drawReferenceLine(signalSL, "SL", palette.stop);
    drawReferenceLine(signalTP, "TP", palette.target);

    visibleCandles.forEach((candle, index) => {
      const x = padding.left + (index + 0.5) * candleSpacing;
      const isBull = candle.close >= candle.open;
      const bodyColor = isBull ? palette.up : palette.down;
      const wickColor = isBull ? palette.wickUp : palette.wickDown;

      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);

      ctx.strokeStyle = wickColor;
      ctx.lineWidth = wickWidth;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

      if (bodyHeight <= 1.8) {
        ctx.beginPath();
        ctx.moveTo(x - safeCandleWidth / 2, openY);
        ctx.lineTo(x + safeCandleWidth / 2, openY);
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = isMobile ? 2 : 1.6;
        ctx.stroke();
      } else {
        ctx.fillStyle = bodyColor;
        ctx.fillRect(
          x - safeCandleWidth / 2,
          bodyTop,
          safeCandleWidth,
          bodyHeight
        );
      }

      if (!isMobile && volumeHeight > 0) {
        const volumeTop = volumeToY(candle.volume || 0);
        ctx.fillStyle = isBull ? palette.volumeUp : palette.volumeDown;
        ctx.fillRect(
          x - Math.max(1, safeCandleWidth * 0.4),
          volumeTop,
          Math.max(2, safeCandleWidth * 0.8),
          padding.top + priceChartHeight + 8 + volumeHeight - volumeTop
        );
      }
    });

    if (showEMA20) {
      drawLineSeries(ctx, ema20Series, palette.ema20, candleSpacing, padding.left, priceToY);
    }

    if (showEMA50) {
      drawLineSeries(ctx, ema50Series, palette.ema50, candleSpacing, padding.left, priceToY);
    }

    if (showVWAP) {
      drawLineSeries(ctx, vwapSeries, palette.vwap, candleSpacing, padding.left, priceToY);
    }

    const labelCount = clamp(
      Math.floor(chartWidth / (isMobile ? 165 : 180)),
      3,
      8
    );

    for (let i = 0; i < labelCount; i++) {
      const candleIndex = Math.min(
        visibleCandles.length - 1,
        Math.floor(
          (visibleCandles.length - 1) * (i / Math.max(1, labelCount - 1))
        )
      );
      const candle = visibleCandles[candleIndex];
      const x = padding.left + (candleIndex + 0.5) * candleSpacing;

      ctx.fillStyle = palette.axis;
      ctx.font = isMobile
        ? '9px "Segoe UI", Arial, sans-serif'
        : '10px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(
        formatAxisTime(candle.bucket, timeframe),
        x,
        height - padding.bottom + 18
      );
    }

    const latest = visibleCandles[visibleCandles.length - 1];
    if (latest) {
      const lastY = priceToY(latest.close);

      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = darkMode
        ? "rgba(203,213,225,0.22)"
        : "rgba(51,65,85,0.20)";
      ctx.beginPath();
      ctx.moveTo(padding.left, lastY);
      ctx.lineTo(width - padding.right, lastY);
      ctx.stroke();
      ctx.restore();

      const lastText = formatPrice(latest.close, symbol);
      ctx.font = 'bold 10px "Segoe UI", Arial, sans-serif';
      const boxW = ctx.measureText(lastText).width + 12;
      const labelX = width - padding.right + 8;

      ctx.fillStyle = latest.close >= latest.open ? palette.up : palette.down;
      ctx.fillRect(labelX, lastY - 10, boxW, 18);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(lastText, labelX + 6, lastY + 3);
    }

    if (
      !isMobile &&
      hover &&
      hover.index >= 0 &&
      hover.index < visibleCandles.length
    ) {
      const x = padding.left + (hover.index + 0.5) * candleSpacing;
      const y = hover.y;

      ctx.save();
      ctx.strokeStyle = palette.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + priceChartHeight + volumeHeight + 8);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.restore();

      const candle = hover.candle;
      const boxX = padding.left + 10;
      const boxY = padding.top + 10;
      const boxW = 226;
      const boxH = 96;

      ctx.fillStyle = palette.tooltipBg;
      ctx.strokeStyle = palette.tooltipBorder;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = palette.tooltipText;
      ctx.textAlign = "left";
      ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
      ctx.fillText(
        formatTooltipTime(candle.bucket, timeframe),
        boxX + 10,
        boxY + 18
      );

      ctx.font = '11px Consolas, Menlo, monospace';
      ctx.fillText(
        `O  ${formatPrice(candle.open, symbol)}`,
        boxX + 10,
        boxY + 40
      );
      ctx.fillText(
        `H  ${formatPrice(candle.high, symbol)}`,
        boxX + 118,
        boxY + 40
      );
      ctx.fillText(
        `L  ${formatPrice(candle.low, symbol)}`,
        boxX + 10,
        boxY + 62
      );
      ctx.fillText(
        `C  ${formatPrice(candle.close, symbol)}`,
        boxX + 118,
        boxY + 62
      );
      ctx.fillText(
        `V  ${(candle.volume || 0).toLocaleString()}`,
        boxX + 10,
        boxY + 84
      );
    }
  };

  useEffect(() => {
    drawChart();
  }, [
    visibleCandles,
    darkMode,
    signalEntry,
    signalSL,
    signalTP,
    hover,
    timeframe,
    symbol,
    loading,
    palette,
    zoom,
    isMobile,
  ]);

  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = window.setTimeout(() => drawChart(), 80);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current);
    };
  }, [
    visibleCandles,
    darkMode,
    signalEntry,
    signalSL,
    signalTP,
    timeframe,
    symbol,
    loading,
    palette,
    zoom,
    isMobile,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!candles.length) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const width = rect.width;
      const leftPad = isMobile ? 2 : 14;
      const rightPad = isMobile ? 86 : 96;
      const chartWidth = Math.max(1, width - leftPad - rightPad);
      const ratio = clamp((mouseX - leftPad) / chartWidth, 0, 1);

      const prevZoom = zoom;
      const direction = event.deltaY < 0 ? 1 : -1;
      const nextZoom = clamp(
        Number((prevZoom + direction * 0.35).toFixed(2)),
        1,
        12
      );

      const prevWindow = Math.round(candles.length / prevZoom);
      const nextWindow = Math.round(candles.length / nextZoom);
      const focusIndex = offset + prevWindow * ratio;
      const nextOffset = focusIndex - nextWindow * ratio;

      setZoom(nextZoom);
      setOffset(nextOffset);
    };

    canvas.addEventListener("wheel", wheelHandler, { passive: false });
    return () => canvas.removeEventListener("wheel", wheelHandler);
  }, [candles.length, zoom, offset, isMobile]);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-lg"
      style={{
        background: darkMode ? "#08111f" : "#ffffff",
        cursor: isDraggingUi ? "grabbing" : "crosshair",
        touchAction: "none",
      }}
    >

      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        {showEMA20 ? (
          <div style={{ fontSize: 11, color: palette.ema20, fontWeight: 700 }}>
            EMA20
          </div>
        ) : null}
        {showEMA50 ? (
          <div style={{ fontSize: 11, color: palette.ema50, fontWeight: 700 }}>
            EMA50
          </div>
        ) : null}
        {showVWAP ? (
          <div style={{ fontSize: 11, color: palette.vwap, fontWeight: 700 }}>
            VWAP
          </div>
        ) : null}
        {showSessions ? (
          <div style={{ fontSize: 11, color: palette.axis, fontWeight: 700 }}>
            Sessions
          </div>
        ) : null}
      </div>

      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        onPointerDown={(event) => {
          event.preventDefault();
          draggingRef.current = true;
          setIsDraggingUi(true);
          dragStartXRef.current = event.clientX;
          dragStartOffsetRef.current = offset;
          try {
            (event.currentTarget as HTMLCanvasElement).setPointerCapture(
              event.pointerId
            );
          } catch {}
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          draggingRef.current = false;
          setIsDraggingUi(false);
          try {
            (event.currentTarget as HTMLCanvasElement).releasePointerCapture(
              event.pointerId
            );
          } catch {}
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
          setIsDraggingUi(false);
        }}
        onPointerLeave={() => {
          draggingRef.current = false;
          setIsDraggingUi(false);
          setHover(null);
        }}
        onDoubleClick={() => {
          setZoom(initialZoom);
          setOffset(0);
        }}
        onPointerMove={(event) => {
          if (!containerRef.current || !visibleCandles.length) return;

          const rect = containerRef.current.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;

          const paddingLeft = isMobile ? 2 : 14;
          const paddingRight = isMobile ? 86 : 96;
          const chartWidth = rect.width - paddingLeft - paddingRight;
          const logicalVisibleCount = visibleCandles.length + (isMobile ? 3.2 : 1.0);
          const spacing = chartWidth / Math.max(logicalVisibleCount, 1);

          if (draggingRef.current) {
            event.preventDefault();

            const dragPx = event.clientX - dragStartXRef.current;
            const shiftCandles = -dragPx / Math.max(spacing, 1);

            setOffset(() => {
              const minWindow = Math.min(isMobile ? 3 : 28, candles.length);
              const maxWindow = candles.length;
              const windowSize = clamp(
                Math.round(candles.length / zoom),
                minWindow,
                maxWindow
              );
              const maxStart = Math.max(
                0,
                candles.length - windowSize + (isMobile ? 3.2 : 1.0)
              );
              return clamp(dragStartOffsetRef.current + shiftCandles, 0, maxStart);
            });
          }

          const rawIndex = Math.floor((x - paddingLeft) / spacing);
          const index = clamp(rawIndex, 0, visibleCandles.length - 1);
          if (!Number.isFinite(index)) return;

          setHover({
            x,
            y,
            index,
            candle: visibleCandles[index],
          });
        }}
      />

      <div
        className="pointer-events-none absolute left-0.5 top-0.5 rounded-md px-1 py-0.5 text-[8px] backdrop-blur-sm"
        style={{
          background: palette.controlBg,
          color: palette.controlText,
          border: `1px solid ${palette.controlBorder}`,
        }}
      >
        Drag = pan
      </div>

      <div className="absolute right-2 top-1 z-20 flex gap-1.5">
        <button
          type="button"
          onClick={() =>
            setZoom((z) => clamp(Number((z + 0.5).toFixed(2)), 1, 12))
          }
          className="rounded-md px-1.5 py-1 text-[10px] backdrop-blur-sm"
          style={{
            background: palette.controlBg,
            color: palette.controlText,
            border: `1px solid ${palette.controlBorder}`,
          }}
        >
          +
        </button>
        <button
          type="button"
          onClick={() =>
            setZoom((z) => clamp(Number((z - 0.5).toFixed(2)), 1, 12))
          }
          className="rounded-md px-1.5 py-1 text-[10px] backdrop-blur-sm"
          style={{
            background: palette.controlBg,
            color: palette.controlText,
            border: `1px solid ${palette.controlBorder}`,
          }}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(initialZoom);
            setOffset(0);
          }}
          className="rounded-md px-1.5 py-1 text-[10px] backdrop-blur-sm"
          style={{
            background: palette.controlBg,
            color: palette.controlText,
            border: `1px solid ${palette.controlBorder}`,
          }}
        >
          Reset
        </button>
      </div>

      {loading ? (
        <div
          className="pointer-events-none absolute right-2 top-10 rounded-md px-1 py-0.5 text-[9px] backdrop-blur-sm"
          style={{
            background: palette.controlBg,
            color: palette.controlText,
            border: `1px solid ${palette.controlBorder}`,
          }}
        >
          Loading...
        </div>
      ) : null}
    </div>
  );
}