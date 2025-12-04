import { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  useWebSocketQuery,
  getWebSocketQueryOptions,
} from '@/hooks/useWebSocketQuery';

// 주식 데이터 타입
interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

// Mock API 함수들
const fetchStocks = async (): Promise<Stock[]> => {
  return [
    {
      symbol: 'AAPL',
      name: '애플',
      price: 178250,
      change: 2150,
      changePercent: 1.22,
      volume: 54231000,
      high: 180000,
      low: 176000,
    },
    {
      symbol: 'GOOGL',
      name: '구글',
      price: 141800,
      change: -950,
      changePercent: -0.67,
      volume: 28450000,
      high: 143000,
      low: 140500,
    },
    {
      symbol: 'MSFT',
      name: '마이크로소프트',
      price: 378910,
      change: 5420,
      changePercent: 1.45,
      volume: 22680000,
      high: 380000,
      low: 375000,
    },
  ];
};

// React Query 클라이언트 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...getWebSocketQueryOptions(),
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * 주식 카드 컴포넌트
 */
function StockCard({ stock }: { stock: Stock }) {
  const isPositive = stock.change >= 0;
  const bgColor = isPositive ? '#fff5f5' : '#f0f7ff';
  const borderColor = isPositive ? '#ff4757' : '#2e86de';
  const textColor = isPositive ? '#ff4757' : '#2e86de';

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        fontFamily: 'monospace',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#222' }}>
            {stock.symbol}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            {stock.name}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{ fontSize: '24px', fontWeight: 'bold', color: textColor }}
          >
            {stock.price.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: textColor,
              marginTop: '4px',
            }}
          >
            {isPositive ? '▲' : '▼'} {Math.abs(stock.change).toLocaleString()} (
            {isPositive ? '+' : ''}
            {stock.changePercent.toFixed(2)}%)
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#666',
        }}
      >
        <span>고가: {stock.high.toLocaleString()}</span>
        <span>저가: {stock.low.toLocaleString()}</span>
        <span>거래량: {(stock.volume / 10000).toFixed(0)}만</span>
      </div>
    </div>
  );
}

/**
 * 패턴 1: Query Invalidation (주식 스타일)
 */
function QueryInvalidationExample() {
  const queryClient = useQueryClient();

  // React Query로 주식 데이터 조회
  const { data: stocks, isLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: fetchStocks,
  });

  // WebSocket 연결 및 메시지 처리
  const { isConnected, messages } = useWebSocketQuery({
    url: 'ws://localhost:3001',
    onMessage: data => {
      try {
        const message = JSON.parse(data as string);

        // PRICE_UPDATE 메시지 처리
        if (message.type === 'PRICE_UPDATE') {
          const { symbol, price, change, changePercent, volume } = message.data;

          // 기존 stocks 데이터 가져오기
          const currentStocks =
            queryClient.getQueryData<Stock[]>(['stocks']) || [];

          // 해당 종목 업데이트
          const updatedStocks = currentStocks.map(stock => {
            if (stock.symbol === symbol) {
              return {
                ...stock,
                price: Math.round(price),
                change: Math.round(change),
                changePercent: parseFloat(changePercent.toFixed(2)),
                volume,
                high: Math.max(stock.high, Math.round(price)),
                low: Math.min(stock.low, Math.round(price)),
              };
            }
            return stock;
          });

          // 캐시 직접 업데이트
          queryClient.setQueryData(['stocks'], updatedStocks);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    },
  });

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, color: '#222', fontSize: '20px' }}>
          📊 실시간 종목 시세 (Query Invalidation)
        </h2>
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: isConnected ? '#27ae60' : '#e74c3c',
            color: '#fff',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          {isConnected ? '● 실시간' : '● 연결끊김'}
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {isLoading ? (
          <div style={{ color: '#999' }}>로딩 중...</div>
        ) : (
          stocks?.map(stock => <StockCard key={stock.symbol} stock={stock} />)
        )}
      </div>

      {/* 시세 흐름 */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
          최근 시세 변동 (5건)
        </div>
        <div
          style={{
            backgroundColor: '#f8f9fa',
            padding: '12px',
            borderRadius: '8px',
            maxHeight: '120px',
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
          }}
        >
          {messages.slice(-5).map((msg, idx) => (
            <div
              key={idx}
              style={{
                color: '#27ae60',
                fontSize: '11px',
                marginBottom: '4px',
                fontFamily: 'monospace',
              }}
            >
              {new Date().toLocaleTimeString()} | {msg}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: 'rgba(39, 174, 96, 0.08)',
          borderLeft: '3px solid #27ae60',
          color: '#555',
          fontSize: '12px',
        }}
      >
        💡 <strong>패턴 1:</strong> WebSocket 메시지로 전체 종목 데이터를 업데이트합니다.
        실무에서는 invalidateQueries()로 REST API를 다시 호출하지만, 이 예제는 학습용이므로
        setQueryData()를 사용합니다.
      </div>
    </div>
  );
}

/**
 * 패턴 2: Partial Updates (주식 호가창 스타일)
 */
function PartialUpdatesExample() {
  const queryClient = useQueryClient();
  const [selectedSymbol] = useState('AAPL');

  // 실시간 호가 데이터 (캐시에서 가져오기)
  const orderbook = queryClient.getQueryData<{
    asks: Array<{ price: number; quantity: number }>;
    bids: Array<{ price: number; quantity: number }>;
  }>(['orderbook', selectedSymbol]);

  // WebSocket 연결 (호가 데이터 직접 업데이트)
  const { isConnected, messages } = useWebSocketQuery({
    url: 'ws://localhost:3001',
    onMessage: data => {
      try {
        const message = JSON.parse(data as string);

        // PRICE_UPDATE 메시지로 호가창 생성
        if (
          message.type === 'PRICE_UPDATE' &&
          message.data.symbol === selectedSymbol
        ) {
          const { price } = message.data;
          const basePrice = Math.round(price);

          // 현재가 기준으로 호가창 생성
          const mockOrderbook = {
            asks: [
              {
                price: basePrice + 100,
                quantity: Math.floor(Math.random() * 2000) + 1000,
              },
              {
                price: basePrice + 200,
                quantity: Math.floor(Math.random() * 2500) + 1500,
              },
              {
                price: basePrice + 300,
                quantity: Math.floor(Math.random() * 2000) + 1000,
              },
              {
                price: basePrice + 400,
                quantity: Math.floor(Math.random() * 3500) + 1000,
              },
              {
                price: basePrice + 500,
                quantity: Math.floor(Math.random() * 1500) + 500,
              },
            ],
            bids: [
              {
                price: basePrice - 100,
                quantity: Math.floor(Math.random() * 2500) + 1500,
              },
              {
                price: basePrice - 200,
                quantity: Math.floor(Math.random() * 2000) + 1500,
              },
              {
                price: basePrice - 300,
                quantity: Math.floor(Math.random() * 3000) + 1500,
              },
              {
                price: basePrice - 400,
                quantity: Math.floor(Math.random() * 1500) + 1000,
              },
              {
                price: basePrice - 500,
                quantity: Math.floor(Math.random() * 4000) + 1500,
              },
            ],
          };

          queryClient.setQueryData(
            ['orderbook', selectedSymbol],
            mockOrderbook,
          );
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    },
  });

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, color: '#222', fontSize: '20px' }}>
          📋 호가창 (Partial Updates)
        </h2>
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: isConnected ? '#27ae60' : '#e74c3c',
            color: '#fff',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          {isConnected ? '● 실시간' : '● 연결끊김'}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <div
          style={{
            color: '#222',
            fontSize: '14px',
            marginBottom: '12px',
            fontWeight: 'bold',
          }}
        >
          {selectedSymbol} 애플
        </div>

        {/* 호가창 */}
        <div
          style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            overflow: 'hidden',
            fontFamily: 'monospace',
            border: '1px solid #e0e0e0',
          }}
        >
          {/* 매도호가 (빨강) */}
          <div style={{ borderBottom: '2px solid #dee2e6' }}>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#ffebee',
                color: '#d32f2f',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>매도호가</span>
              <span>수량</span>
            </div>
            {orderbook?.asks.map((ask, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: '#ff4757', fontWeight: 'bold' }}>
                  {ask.price.toLocaleString()}
                </span>
                <span style={{ color: '#666' }}>
                  {ask.quantity.toLocaleString()}
                </span>
              </div>
            )) || (
              <div
                style={{ padding: '20px', textAlign: 'center', color: '#999' }}
              >
                데이터 수신 대기중...
              </div>
            )}
          </div>

          {/* 매수호가 (파랑) */}
          <div>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>매수호가</span>
              <span>수량</span>
            </div>
            {orderbook?.bids.map((bid, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: '#2e86de', fontWeight: 'bold' }}>
                  {bid.price.toLocaleString()}
                </span>
                <span style={{ color: '#666' }}>
                  {bid.quantity.toLocaleString()}
                </span>
              </div>
            )) || (
              <div
                style={{ padding: '20px', textAlign: 'center', color: '#999' }}
              >
                데이터 수신 대기중...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 체결 내역 */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
          체결 내역
        </div>
        <div
          style={{
            backgroundColor: '#f8f9fa',
            padding: '12px',
            borderRadius: '8px',
            maxHeight: '120px',
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
          }}
        >
          {messages.slice(-5).map((msg, idx) => (
            <div
              key={idx}
              style={{
                color: '#27ae60',
                fontSize: '11px',
                marginBottom: '4px',
                fontFamily: 'monospace',
              }}
            >
              {new Date().toLocaleTimeString()} | 체결: {msg}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: 'rgba(46, 134, 222, 0.08)',
          borderLeft: '3px solid #2e86de',
          color: '#555',
          fontSize: '12px',
        }}
      >
        💡 <strong>패턴 2:</strong> WebSocket 메시지로 특정 데이터(호가창)만 업데이트합니다.
        setQueryData()로 캐시를 부분 업데이트하여 필요한 부분만 즉시 반영합니다.
      </div>
    </div>
  );
}

/**
 * 주식 창 스타일 WebSocket + React Query 데모
 */
export default function WebSocketQueryDemo() {
  return (
    <QueryClientProvider client={queryClient}>
      <div
        style={{
          padding: '20px',
          maxWidth: '1400px',
          margin: '0 auto',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            marginBottom: '30px',
            padding: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <h1 style={{ margin: 0, color: '#fff', fontSize: '28px' }}>
            📈 실시간 증권 시스템
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#eee', fontSize: '14px' }}>
            WebSocket + React Query를 활용한 실시간 주식 데이터 시스템
          </p>
        </div>

        <QueryInvalidationExample />
        <PartialUpdatesExample />

        {/* 기술 스택 정보 */}
        <div
          style={{
            padding: '24px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', color: '#222', fontSize: '18px' }}>
            🔧 기술 스택
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '3px solid #ff4757',
                border: '1px solid #e0e0e0',
              }}
            >
              <div
                style={{
                  color: '#ff4757',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Query Invalidation
              </div>
              <div
                style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}
              >
                전체 데이터셋을 새로 불러올 때 사용. 데이터 구조가 복잡하거나
                서버에서 전체 데이터를 다시 받아야 할 때 적합합니다.
              </div>
            </div>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '3px solid #2e86de',
                border: '1px solid #e0e0e0',
              }}
            >
              <div
                style={{
                  color: '#2e86de',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Partial Updates
              </div>
              <div
                style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}
              >
                특정 데이터만 업데이트할 때 사용. setQueryData로 캐시를 직접
                업데이트하여 서버 요청 없이 즉시 UI 반영. 더 효율적입니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}
