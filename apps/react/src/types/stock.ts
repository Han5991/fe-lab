/**
 * 주식 티커 정보
 */
export interface StockTicker {
  /** 종목 코드 */
  symbol: string;
  /** 종목명 */
  name: string;
  /** 현재가 */
  price: number;
  /** 전일 대비 변동액 */
  change: number;
  /** 전일 대비 변동률 (%) */
  changePercent: number;
  /** 거래량 */
  volume: number;
  /** 마지막 업데이트 시간 */
  timestamp: number;
}

/**
 * WebSocket으로 수신되는 주식 가격 업데이트 메시지
 */
export interface StockPriceUpdate {
  type: 'PRICE_UPDATE';
  data: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: number;
  };
}

/**
 * 주식 체결 정보
 */
export interface StockTrade {
  /** 종목 코드 */
  symbol: string;
  /** 체결 가격 */
  price: number;
  /** 체결 수량 */
  quantity: number;
  /** 체결 시간 */
  timestamp: number;
  /** 매수/매도 구분 */
  side: 'BUY' | 'SELL';
}

/**
 * 호가 정보
 */
export interface OrderBook {
  /** 종목 코드 */
  symbol: string;
  /** 매도 호가 (가격 높은 순) */
  asks: Array<{ price: number; quantity: number }>;
  /** 매수 호가 (가격 높은 순) */
  bids: Array<{ price: number; quantity: number }>;
  /** 업데이트 시간 */
  timestamp: number;
}

/**
 * WebSocket 메시지 타입
 */
export type StockWebSocketMessage =
  | StockPriceUpdate
  | { type: 'TRADE'; data: StockTrade }
  | { type: 'ORDERBOOK'; data: OrderBook }
  | { type: 'SUBSCRIBE'; symbol: string }
  | { type: 'UNSUBSCRIBE'; symbol: string };
