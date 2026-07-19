/**
 * CryptoAI — Realistic Cryptocurrency Mock Data
 */
import {StockItem, MarketIndex, AISignal, NewsItem, Portfolio} from '../types';

export const marketIndices: MarketIndex[] = [
  {
    name: 'Fear & Greed',
    value: 65,
    change: 5,
    changePercent: 8.33,
    volume: 0,
  },
  {
    name: 'BTC Dominance',
    value: 54.2,
    change: 0.15,
    changePercent: 0.28,
    volume: 0,
  },
  {
    name: 'Total Cap (T)',
    value: 2.45,
    change: 0.04,
    changePercent: 1.65,
    volume: 98_000_000_000,
  },
];

export const stockList: StockItem[] = [
  {symbol: 'BTC', name: 'Bitcoin', exchange: 'BINANCE', price: 63985.94, change: 1152.30, changePercent: 1.85, volume: 28_542_300_000, high: 64200.00, low: 62500.00, open: 62833.64, prevClose: 62833.64},
  {symbol: 'ETH', name: 'Ethereum', exchange: 'BINANCE', price: 3452.12, change: -12.45, changePercent: -0.36, volume: 15_231_800_000, high: 3512.00, low: 3410.00, open: 3464.57, prevClose: 3464.57},
  {symbol: 'ALLO', name: 'Allora', exchange: 'BINANCE', price: 0.4496, change: 0.0639, changePercent: 16.6, volume: 12_900_000, high: 0.4600, low: 0.3800, open: 0.3857, prevClose: 0.3857},
  {symbol: 'KITE', name: 'Kite', exchange: 'BINANCE', price: 0.1115, change: -0.0023, changePercent: -2.0, volume: 5_200_000, high: 0.1150, low: 0.1100, open: 0.1138, prevClose: 0.1138},
  {symbol: 'NEAR', name: 'NEAR Protocol', exchange: 'BINANCE', price: 1.90, change: -0.03, changePercent: -1.3, volume: 145_000_000, high: 1.95, low: 1.88, open: 1.93, prevClose: 1.93},
  {symbol: 'TRX', name: 'TRON', exchange: 'BINANCE', price: 0.3237, change: 0.0014, changePercent: 0.4, volume: 290_000_000, high: 0.3250, low: 0.3210, open: 0.3223, prevClose: 0.3223},
  {symbol: 'SOL', name: 'Solana', exchange: 'BINANCE', price: 145.22, change: 4.56, changePercent: 3.24, volume: 2_923_400_000, high: 147.00, low: 140.10, open: 140.66, prevClose: 140.66},
];

export const aiSignals: AISignal[] = [
  {
    id: '1',
    symbol: 'ALLO',
    companyName: 'Allora',
    signal: 'BUY',
    confidence: 85,
    technicalScore: 78,
    fundamentalScore: 82,
    price: 0.4496,
    targetPrice: 0.5200,
    stopLoss: 0.3900,
    reasons: [
      'RSI = 45 — trung tính, có dư địa tăng lớn',
      'Đang gần Hỗ trợ cứng $0.35, rủi ro thấp',
      'Khối lượng giao dịch tăng 24% khẳng định breakout',
    ],
    timestamp: '2026-07-19T08:30:00Z',
  },
  {
    id: '2',
    symbol: 'KITE',
    companyName: 'Kite',
    signal: 'DCA',
    confidence: 72,
    technicalScore: 50,
    fundamentalScore: 60,
    price: 0.1115,
    targetPrice: 0.1350,
    stopLoss: 0.0950,
    reasons: [
      'Giá đang tích lũy tốt gần vùng hỗ trợ $0.1100',
      'Độ biến động ATR giảm cho thấy lực bán yếu đi',
      'Nên mua gom thêm ở mức giá này',
    ],
    timestamp: '2026-07-19T09:15:00Z',
  },
  {
    id: '3',
    symbol: 'NEAR',
    companyName: 'NEAR Protocol',
    signal: 'HOLD',
    confidence: 65,
    technicalScore: 40,
    fundamentalScore: 55,
    price: 1.90,
    targetPrice: 2.20,
    stopLoss: 1.75,
    reasons: [
      'Chỉ báo MACD đi ngang trong vùng trung tính',
      'Giá giữ vững trên đường SMA(50) ngày',
      'Chưa nên mua thêm, tiếp tục giữ theo dõi',
    ],
    timestamp: '2026-07-19T10:00:00Z',
  },
];

export const newsItems: NewsItem[] = [
  {
    id: '1',
    title: 'Giá Bitcoin ổn định trên $63.000 trước quyết định lãi suất của Fed',
    source: 'Coindesk',
    timeAgo: '15 phút trước',
    category: 'Vĩ mô',
  },
  {
    id: '2',
    title: 'Allora Network công bố đối tác AI mới trị giá 100 triệu USD',
    source: 'Cointelegraph',
    timeAgo: '1 giờ trước',
    category: 'Dự án',
  },
  {
    id: '3',
    title: 'Dòng vốn ETF Ethereum tiếp tục ghi nhận trạng thái dương ròng ngày thứ 5 liên tiếp',
    source: 'Blockworks',
    timeAgo: '2 giờ trước',
    category: 'Thị trường',
  },
  {
    id: '4',
    title: 'NEAR Protocol ghi nhận mức phí giao dịch giảm sâu kỷ lục sau đợt nâng cấp Sharding mới',
    source: 'Cointelegraph',
    timeAgo: '3 giờ trước',
    category: 'Dự án',
  },
];

export const portfolioData: Portfolio = {
  totalValue: 534.81,
  totalPnl: 0.93,
  totalPnlPercent: 0.17,
  holdings: [
    {symbol: 'ALLO', name: 'Allora', shares: 427.61918, avgCost: 0.3857, currentPrice: 0.4496, totalValue: 192.26, pnl: 27.33, pnlPercent: 16.57},
    {symbol: 'KITE', name: 'Kite', shares: 1460.8579, avgCost: 0.1138, currentPrice: 0.1115, totalValue: 162.89, pnl: -3.36, pnlPercent: -2.02},
    {symbol: 'NEAR', name: 'NEAR Protocol', shares: 53.70000, avgCost: 1.9300, currentPrice: 1.9000, totalValue: 102.03, pnl: -1.61, pnlPercent: -1.55},
    {symbol: 'TRX', name: 'TRON', shares: 307.70000, avgCost: 0.3223, currentPrice: 0.3237, totalValue: 99.60, pnl: 0.43, pnlPercent: 0.43},
  ],
};
