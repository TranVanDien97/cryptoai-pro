import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import axios from 'axios';

interface ChartWidgetProps {
  symbol: string;
  entryPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
}

const ChartWidget = ({ symbol, entryPrice, takeProfit, stopLoss }: ChartWidgetProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8f95a5',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });
    
    chartRef.current = chart;

    // @ts-ignore
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff3d00',
      borderVisible: false,
      wickUpColor: '#00e676',
      wickDownColor: '#ff3d00',
    });
    
    seriesRef.current = candlestickSeries;

    // Fetch initial historical data (1 hour interval)
    axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=100`)
      .then(res => {
        const data = res.data.map((d: any) => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4])
        }));
        candlestickSeries.setData(data);

        // Add price lines for Entry, TP, SL
        if (entryPrice) {
          candlestickSeries.createPriceLine({
            price: entryPrice,
            color: '#2979ff',
            lineWidth: 2,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: 'ENTRY',
          });
        }
        if (takeProfit) {
          candlestickSeries.createPriceLine({
            price: takeProfit,
            color: '#00e676',
            lineWidth: 2,
            lineStyle: 1, // Solid
            axisLabelVisible: true,
            title: 'TP',
          });
        }
        if (stopLoss) {
          candlestickSeries.createPriceLine({
            price: stopLoss,
            color: '#ff3d00',
            lineWidth: 2,
            lineStyle: 1, // Solid
            axisLabelVisible: true,
            title: 'SL',
          });
        }
      })
      .catch(err => console.error("Error fetching historical data for chart", err));

    // Connect to WebSocket for live candle updates
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_15m`);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.k) {
        const kline = message.k;
        candlestickSeries.update({
          time: kline.t / 1000 as any,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
        });
      }
    };

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      chart.remove();
    };
  }, [symbol, entryPrice, takeProfit, stopLoss]);

  return (
    <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 className="font-mono" style={{ margin: 0, color: 'var(--text-primary)' }}>Biểu đồ Live: {symbol} (15m)</h3>
      </div>
      <div ref={chartContainerRef} style={{ width: '100%', height: '300px' }} />
    </div>
  );
};

export default ChartWidget;
