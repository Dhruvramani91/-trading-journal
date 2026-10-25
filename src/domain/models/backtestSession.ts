import type { TemplateDefinition } from '@/domain/models/trade';
import type { TradePhotos } from '@/lib/tradePhotos';

export type BacktestSection = 'statistics' | 'calendar' | 'journal';

export interface BacktestSession {
  id: string;
  name: string;
  instruments: string[];
  startDate: string;
  endDate: string;
  templateId: string;
  templateSnapshot: TemplateDefinition;
  createdAt: string;
}

export interface CreateBacktestSessionInput {
  name: string;
  instruments: string[];
  startDate: string;
  endDate: string;
  template: TemplateDefinition;
}

export interface BacktestTrade {
  id: string;
  sessionId: string;
  openedAt: string;
  instrument: string;
  direction: 'long' | 'short';
  result: 'win' | 'loss' | 'be';
  grade?: 'A+' | 'A' | 'B' | 'C';
  realizedR?: number;
  pnl?: number;
  templateData: Record<string, string | number | boolean | null>;
  photos?: TradePhotos;
  mistake?: string;
  notes?: string;
  createdAt: string;
}

export type BacktestTradeInput = Omit<BacktestTrade, 'id' | 'sessionId' | 'createdAt'>;
