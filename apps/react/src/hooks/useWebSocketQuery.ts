import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';

interface UseWebSocketQueryOptions {
  /** WebSocket URL */
  url: string;
  /** 자동 재연결 여부 (기본: true) */
  autoReconnect?: boolean;
  /** 최대 재연결 시도 횟수 (기본: 5) */
  maxReconnectAttempts?: number;
  /** 메시지 수신 시 무효화할 쿼리 키들 */
  invalidateQueries?: QueryKey[];
  /** 메시지 파싱 및 쿼리 데이터 업데이트 콜백 */
  onMessage?: (data: unknown) => void;
}

/**
 * React Query와 통합된 WebSocket 훅
 *
 * 두 가지 데이터 동기화 전략을 지원:
 * 1. Query Invalidation: 메시지 수신 시 특정 쿼리를 무효화하여 리페칭
 * 2. Partial Updates: onMessage 콜백으로 쿼리 캐시를 직접 업데이트
 *
 * @example
 * // Query Invalidation 패턴
 * const { sendMessage } = useWebSocketQuery({
 *   url: 'wss://api.example.com',
 *   invalidateQueries: [['todos'], ['users']],
 * });
 *
 * @example
 * // Partial Updates 패턴
 * const { sendMessage } = useWebSocketQuery({
 *   url: 'wss://api.example.com',
 *   onMessage: (data) => {
 *     const message = JSON.parse(data as string);
 *     if (message.type === 'TODO_UPDATED') {
 *       // useQueryClient는 useWebSocketQuery를 호출하는 컴포넌트에서 사용
 *       // 실제 캐시 업데이트는 onMessage 콜백 내부에서 수행
 *     }
 *   },
 * });
 */
export function useWebSocketQuery(options: UseWebSocketQueryOptions) {
  const {
    url,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    invalidateQueries = [],
    onMessage,
  } = options;

  const queryClient = useQueryClient();
  const lastMessageRef = useRef<string | null>(null);

  const webSocket = useWebSocket({
    url,
    autoReconnect,
    maxReconnectAttempts,
  });

  // WebSocket 메시지 처리
  useEffect(() => {
    const messages = webSocket.messages;
    if (messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];

    // 시스템 메시지나 중복 메시지는 무시
    if (
      latestMessage.startsWith('[시스템]') ||
      latestMessage === lastMessageRef.current
    ) {
      return;
    }

    lastMessageRef.current = latestMessage;

    // "수신: " 접두사 제거
    const messageData = latestMessage.replace(/^수신:\s*/, '');

    try {
      // 1. onMessage 콜백이 있으면 실행 (Partial Updates 패턴)
      if (onMessage) {
        onMessage(messageData);
      }

      // 2. invalidateQueries가 설정되어 있으면 쿼리 무효화 (Query Invalidation 패턴)
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    } catch (error) {
      console.error('Failed to process WebSocket message:', error);
    }
  }, [webSocket.messages, invalidateQueries, onMessage, queryClient]);

  return {
    ...webSocket,
  };
}

/**
 * React Query의 staleTime을 Infinity로 설정하는 헬퍼 함수
 * WebSocket으로 실시간 업데이트를 받는 경우, 불필요한 리페칭을 방지합니다.
 *
 * @example
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: getWebSocketQueryOptions(),
 *   },
 * });
 */
export function getWebSocketQueryOptions() {
  return {
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000, // 5분
  };
}
