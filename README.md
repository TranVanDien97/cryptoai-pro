# 📈 StockAI — AI-Powered Vietnamese Stock Investment App

> Ứng dụng đầu tư chứng khoán thông minh, sử dụng AI tự động phân tích kỹ thuật + cơ bản + sentiment, và gửi tín hiệu mua/bán kịp thời.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    📱 React Native Mobile App                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐  │
│  │   Home   │ │  Market  │ │    AI    │ │Portfol.│ │Settings│  │
│  │Dashboard │ │  Screen  │ │ Signals  │ │ Screen │ │ Screen │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ └────────┘  │
│       │              │            │                              │
│  ┌────▼──────────────▼────────────▼────────────────────────┐    │
│  │           Zustand Store + WebSocket Client               │    │
│  └──────────────────────┬──────────────────────────────────┘    │
└─────────────────────────┼──────────────────────────────────────┘
                          │ Socket.IO
┌─────────────────────────┼──────────────────────────────────────┐
│                    Backend Services                              │
│                          │                                       │
│  ┌───────────────────────▼───────────────────────────────────┐  │
│  │          ⚡ Real-time WebSocket Service (Node.js)          │  │
│  │  Socket.IO Server │ VN Stock Feed │ Alert Engine           │  │
│  └───────────┬───────────────────────────────┬───────────────┘  │
│              │                               │                   │
│  ┌───────────▼───────────┐    ┌──────────────▼──────────────┐  │
│  │  🧠 AI Engine (Python) │    │  🔔 Notification Service    │  │
│  │  FastAPI + vnstock     │    │  FCM Push + History + Prefs │  │
│  │  Technical Analysis    │    └─────────────────────────────┘  │
│  │  Fundamental Analysis  │                                      │
│  │  Signal Generator      │              ┌───────────────────┐  │
│  └────────────────────────┘              │  Redis (Cache)     │  │
│                                          └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 22+**
- **Docker** (optional, for containerized deployment)

### Option A: Run with Docker (Recommended)

```bash
cd backend
docker-compose up --build
```

This starts all 4 services:
| Service | Port | URL |
|---------|------|-----|
| AI Engine | 8000 | http://localhost:8000/docs |
| Real-time WS | 3001 | ws://localhost:3001 |
| Notification | 3002 | http://localhost:3002/health |
| Redis | 6379 | redis://localhost:6379 |

### Option B: Run Manually

#### 1. AI Engine (Python/FastAPI)
```bash
cd backend/services/ai-engine
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

#### 2. Real-time WebSocket Service
```bash
cd backend/services/realtime
npm install
npm run dev
```

#### 3. Notification Service
```bash
cd backend/services/notification
npm install
npm run dev
```

#### 4. Mobile App
```bash
cd mobile
npm install
npx react-native start
# New terminal:
npx react-native run-android  # or run-ios
```

## 📁 Project Structure

```
stockai/
├── backend/
│   ├── docker-compose.yml           # All services orchestration
│   └── services/
│       ├── ai-engine/               # 🧠 Python AI Engine (FastAPI)
│       │   ├── app/
│       │   │   ├── analysis/        # Technical, Fundamental, Signals
│       │   │   ├── api/             # REST endpoints
│       │   │   ├── data/            # vnstock client
│       │   │   └── models.py        # Pydantic models
│       │   └── requirements.txt
│       ├── realtime/                # ⚡ WebSocket Server (Node.js)
│       │   └── src/
│       │       ├── feeds/           # Market data feeds
│       │       ├── handlers/        # Alert engine
│       │       └── index.ts         # Socket.IO server
│       └── notification/            # 🔔 Push Notifications (Node.js)
│           └── src/
│               └── index.ts         # FCM + history + preferences
└── mobile/                          # 📱 React Native App
    ├── App.tsx
    └── src/
        ├── components/              # Reusable UI components
        ├── screens/                 # 6 screens
        ├── hooks/                   # WebSocket hooks
        ├── services/                # API + WebSocket + Notification clients
        ├── stores/                  # Zustand state management
        ├── theme/                   # Design system
        └── types/                   # TypeScript definitions
```

## 🧠 AI Analysis Pipeline

```
Vietnamese Stock Data (vnstock library)
    ↓
Technical Analysis (11 indicators)
  RSI, MACD, SMA, EMA, Bollinger Bands,
  Stochastic, ADX, ATR, OBV, MFI, VWAP
    ↓
Fundamental Analysis
  P/E, P/B, ROE, ROA, D/E, Margins
  (vs Vietnamese industry benchmarks)
    ↓
Signal Generator (60% Tech + 40% Fund)
    ↓
STRONG_BUY │ BUY │ HOLD │ SELL │ STRONG_SELL
  + Confidence %, Target Price, Stop Loss
  + Reasoning in Vietnamese 🇻🇳
```

## 📱 Mobile App Screens

| Screen | Features |
|--------|----------|
| **Home Dashboard** | Portfolio summary, market indices, AI signals, watchlist, news |
| **Market** | Stock list, search, exchange filter (HOSE/HNX/UPCOM), sort, top movers |
| **AI Signals** | Signal cards with confidence, scores, reasons, filter by type |
| **Portfolio** | Holdings table, P&L, allocation bar chart |
| **Notifications** | Real-time alerts: AI signals, price targets, volume spikes |
| **Settings** | Notification toggles, AI config, language, security |

## 🔔 Alert System

| Type | Trigger | Priority |
|------|---------|----------|
| **AI Signal** | Model generates BUY/SELL signal | 🔴 HIGH |
| **Price Target** | Stock hits user-defined price | 🔴 HIGH |
| **Volume Spike** | Volume > 2x daily average | 🟡 MEDIUM |
| **News Alert** | Breaking news for watchlist | 🟡 MEDIUM |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, TypeScript, Zustand, Socket.IO Client |
| AI Engine | Python, FastAPI, vnstock, pandas-ta, Pydantic |
| Real-time | Node.js, Socket.IO, TypeScript |
| Notifications | Express, Firebase Cloud Messaging |
| Cache | Redis |
| Container | Docker Compose |

## ⚠️ Disclaimer

StockAI chỉ cung cấp thông tin tham khảo, không phải tư vấn đầu tư chuyên nghiệp.
Mọi quyết định đầu tư là trách nhiệm của người dùng.

## 📝 License

MIT
