import { create } from 'zustand';

export interface Position {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  takeProfit: number;
  stopLoss: number;
  size: number; // In USD
  pnl: number;
  status: 'OPEN' | 'CLOSED';
}

interface AppState {
  balance: number;
  positions: Position[];
  addPosition: (pos: Omit<Position, 'id' | 'status' | 'pnl' | 'currentPrice'>) => void;
  updatePrice: (symbol: string, price: number) => void;
  closePosition: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  balance: 10000,
  positions: [],
  addPosition: (pos) => set((state) => {
    // Only allow if enough balance
    if (state.balance < pos.size) return state;
    
    const newPosition: Position = {
      ...pos,
      id: Math.random().toString(36).substr(2, 9),
      status: 'OPEN',
      pnl: 0,
      currentPrice: pos.entryPrice
    };
    
    return {
      balance: state.balance - pos.size,
      positions: [newPosition, ...state.positions]
    };
  }),
  updatePrice: (symbol, price) => set((state) => {
    let balanceChange = 0;
    const updatedPositions = state.positions.map(pos => {
      if (pos.symbol === symbol && pos.status === 'OPEN') {
        const diff = (price - pos.entryPrice) / pos.entryPrice;
        const pnl = pos.type === 'LONG' ? pos.size * diff : pos.size * -diff;
        
        // Check for Stop Loss / Take Profit hits
        let status: 'OPEN' | 'CLOSED' = pos.status;
        
        if (pos.type === 'LONG') {
          if (price >= pos.takeProfit || price <= pos.stopLoss) {
            status = 'CLOSED';
            balanceChange += (pos.size + pnl);
          }
        } else {
          if (price <= pos.takeProfit || price >= pos.stopLoss) {
            status = 'CLOSED';
            balanceChange += (pos.size + pnl);
          }
        }
        
        return { ...pos, currentPrice: price, pnl, status };
      }
      return pos;
    });

    return {
      positions: updatedPositions,
      balance: state.balance + balanceChange
    };
  }),
  closePosition: (id) => set((state) => {
    const posIndex = state.positions.findIndex(p => p.id === id);
    if (posIndex === -1 || state.positions[posIndex].status === 'CLOSED') return state;
    
    const pos = state.positions[posIndex];
    const newPositions = [...state.positions];
    newPositions[posIndex] = { ...pos, status: 'CLOSED' };
    
    return {
      positions: newPositions,
      balance: state.balance + pos.size + pos.pnl
    };
  })
}));
