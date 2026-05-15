import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, ColorType } from 'lightweight-charts';
import { fetchChart, fetchPrices, Candle } from '../utils/api';

interface LiveCandlestickChartProps {
  symbol: 'XAUUSD' | 'XAGUSD';
  timeframe: string; // Already converted (e.g., "1m", "5m", "1h")
  darkMode: boolean;
}

export function LiveCandlestickChart({ symbol, timeframe, darkMode }: LiveCandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ohlc, setOhlc] = useState<{ open: number; high: number; low: number; close: number } | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const candlesRef = useRef<CandlestickData[]>([]);
  const retryCountRef = useRef(0);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: darkMode ? '#0a0e1a' : '#ffffff' },
          textColor: darkMode ? '#9ca3af' : '#6b7280',
        },
        grid: {
          vertLines: { color: darkMode ? '#1a2332' : '#e5e7eb' },
          horzLines: { color: darkMode ? '#1a2332' : '#e5e7eb' },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: darkMode ? '#4b5563' : '#9ca3af',
            labelBackgroundColor: darkMode ? '#1f2937' : '#e5e7eb',
          },
          horzLine: {
            color: darkMode ? '#4b5563' : '#9ca3af',
            labelBackgroundColor: darkMode ? '#1f2937' : '#e5e7eb',
          },
        },
        rightPriceScale: {
          borderColor: darkMode ? '#1a2332' : '#e5e7eb',
        },
        timeScale: {
          borderColor: darkMode ? '#1a2332' : '#e5e7eb',
          timeVisible: true,
          secondsVisible: false,
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      // Crosshair move handler
      chart.subscribeCrosshairMove((param) => {
        if (param.time && param.seriesData.size > 0) {
          const data = param.seriesData.get(candlestickSeries) as CandlestickData;
          if (data) {
            setOhlc({
              open: data.open,
              high: data.high,
              low: data.low,
              close: data.close,
            });
          }
        }
      });

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (err) {
      console.error('Error initializing chart:', err);
      setError(true);
      setLoading(false);
    }
  }, [darkMode]);

  // Load historical data
  useEffect(() => {
    const loadChartData = async () => {
      setLoading(true);
      setError(false);

      const chartData = await fetchChart(symbol, timeframe, 120);

      if (!chartData || !chartData.candles || chartData.candles.length === 0) {
        // Retry once
        if (retryCountRef.current === 0) {
          retryCountRef.current++;
          setTimeout(() => loadChartData(), 2000);
          return;
        }
        setError(true);
        setLoading(false);
        return;
      }

      retryCountRef.current = 0;

      // Convert candles to Lightweight Charts format
      const formattedCandles: CandlestickData[] = chartData.candles.map((candle: Candle) => ({
        time: (candle.bucket / 1000) as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      candlesRef.current = formattedCandles;

      if (seriesRef.current) {
        seriesRef.current.setData(formattedCandles);
        
        // Set initial OHLC to last candle
        const lastCandle = formattedCandles[formattedCandles.length - 1];
        if (lastCandle) {
          setOhlc({
            open: lastCandle.open,
            high: lastCandle.high,
            low: lastCandle.low,
            close: lastCandle.close,
          });
          setCurrentPrice(lastCandle.close);
        }
      }

      setLoading(false);
    };

    loadChartData();
  }, [symbol, timeframe]);

  // Live price updates
  useEffect(() => {
    if (loading || error || candlesRef.current.length === 0) return;

    const updateLivePrice = async () => {
      const pricesData = await fetchPrices();
      if (!pricesData) return;

      const livePrice = symbol === 'XAUUSD' ? pricesData.XAUUSD : pricesData.XAGUSD;
      if (!livePrice) return;

      setCurrentPrice(livePrice);

      const lastCandle = candlesRef.current[candlesRef.current.length - 1];
      if (!lastCandle) return;

      // Calculate if we need a new candle based on timeframe
      const timeframeMs = getTimeframeMs(timeframe);
      const currentTime = Math.floor(Date.now() / 1000);
      const lastCandleTime = lastCandle.time as number;
      const nextCandleTime = lastCandleTime + timeframeMs;

      if (currentTime >= nextCandleTime) {
        // Create new candle
        const newCandle: CandlestickData = {
          time: nextCandleTime as Time,
          open: lastCandle.close,
          high: Math.max(lastCandle.close, livePrice),
          low: Math.min(lastCandle.close, livePrice),
          close: livePrice,
        };

        candlesRef.current.push(newCandle);
        
        // Keep only last 200 candles for performance
        if (candlesRef.current.length > 200) {
          candlesRef.current.shift();
        }

        if (seriesRef.current) {
          seriesRef.current.setData(candlesRef.current);
        }

        // Update OHLC display
        setOhlc({
          open: newCandle.open,
          high: newCandle.high,
          low: newCandle.low,
          close: newCandle.close,
        });
      } else {
        // Update existing last candle
        const updatedCandle: CandlestickData = {
          ...lastCandle,
          high: Math.max(lastCandle.high, livePrice),
          low: Math.min(lastCandle.low, livePrice),
          close: livePrice,
        };

        candlesRef.current[candlesRef.current.length - 1] = updatedCandle;

        if (seriesRef.current) {
          seriesRef.current.update(updatedCandle);
        }

        // Update OHLC display
        setOhlc({
          open: updatedCandle.open,
          high: updatedCandle.high,
          low: updatedCandle.low,
          close: updatedCandle.close,
        });
      }
    };

    // Update every 4 seconds
    const interval = setInterval(updateLivePrice, 4000);
    updateLivePrice(); // Initial update

    return () => clearInterval(interval);
  }, [symbol, timeframe, loading, error]);

  // Helper: Convert timeframe to milliseconds
  const getTimeframeMs = (tf: string): number => {
    const map: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
      '1w': 604800,
    };
    return (map[tf] || 3600);
  };

  return (
    <div className="relative w-full h-full">
      {/* Info Bar */}
      <div className={`absolute top-0 left-0 right-0 z-10 ${darkMode ? 'bg-[#0f1623]/95' : 'bg-white/95'} backdrop-blur-sm p-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'} rounded-t-2xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg">{symbol}</span>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>{timeframe.toUpperCase()}</span>
            {currentPrice && (
              <span className="font-mono font-bold text-teal-400">{currentPrice.toFixed(2)}</span>
            )}
          </div>
          {ohlc && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>O: <span className="text-white">{ohlc.open.toFixed(2)}</span></span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>H: <span className="text-green-400">{ohlc.high.toFixed(2)}</span></span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>L: <span className="text-red-400">{ohlc.low.toFixed(2)}</span></span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>C: <span className="text-white">{ohlc.close.toFixed(2)}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="absolute inset-0 pt-16">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading chart data...</p>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Waiting for data...</p>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}