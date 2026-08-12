import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  url: string;
  /** 자동 재연결 여부 (기본: true) */
  autoReconnect?: boolean;
  /** 최대 재연결 시도 횟수 (기본: 5) */
  maxReconnectAttempts?: number;
  /** 초기 재연결 지연 시간 (ms, 기본: 1000) */
  reconnectInterval?: number;
  /** 재연결 지연 시간 증가 배수 (기본: 1.5) */
  reconnectBackoffMultiplier?: number;
}

interface UseWebSocketReturn {
  /** 수신된 메시지 목록 */
  messages: string[];
  /** WebSocket 연결 상태 */
  isConnected: boolean;
  /** 재연결 시도 중 여부 */
  isReconnecting: boolean;
  /** 현재 재연결 시도 횟수 */
  reconnectAttempt: number;
  /** 메시지 전송 함수 */
  sendMessage: (message: string) => void;
  /** 수동 재연결 함수 */
  reconnect: () => void;
  /** WebSocket 연결 종료 함수 */
  disconnect: () => void;
  /** 시스템 메시지 추가 함수 */
  addSystemMessage: (message: string) => void;
}

/**
 * WebSocket 연결을 관리하는 커스텀 훅
 * 자동 재연결 기능 포함
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 1000,
    reconnectBackoffMultiplier = 1.5,
  } = options;

  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  // connect가 자기 자신을 setTimeout에서 참조하면 그 시점의 stale한 인스턴스가
  // 잡힌다(react-hooks v7 immutability 위반). 항상 최신 connect를 부르도록
  // ref를 경유한다.
  const connectRef = useRef<(() => void) | null>(null);

  const addSystemMessage = useCallback((message: string) => {
    setMessages(prev => [...prev, `[시스템] ${message}`]);
  }, []);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempt(0);
        addSystemMessage('서버에 연결되었습니다.');
      };

      ws.onmessage = event => {
        console.log('Received message:', event.data);
        setMessages(prev => [...prev, `수신: ${event.data}`]);
      };

      ws.onerror = error => {
        console.error('WebSocket error:', error);
        addSystemMessage('연결 오류가 발생했습니다.');
      };

      ws.onclose = event => {
        console.log('WebSocket disconnected', event);
        setIsConnected(false);
        wsRef.current = null;

        // 정상 종료(코드 1000)가 아니고 재연결이 활성화된 경우
        if (
          event.code !== 1000 &&
          shouldReconnectRef.current &&
          autoReconnect &&
          reconnectAttempt < maxReconnectAttempts
        ) {
          setIsReconnecting(true);
          const delay =
            reconnectInterval *
            Math.pow(reconnectBackoffMultiplier, reconnectAttempt);
          addSystemMessage(
            `연결이 끊어졌습니다. ${Math.round(delay / 1000)}초 후 재연결 시도... (${reconnectAttempt + 1}/${maxReconnectAttempts})`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connectRef.current?.();
          }, delay);
        } else if (reconnectAttempt >= maxReconnectAttempts) {
          addSystemMessage(
            `최대 재연결 시도 횟수(${maxReconnectAttempts}회)를 초과했습니다. 수동으로 재연결해주세요.`,
          );
          setIsReconnecting(false);
        } else {
          addSystemMessage('서버와의 연결이 종료되었습니다.');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      addSystemMessage('WebSocket 연결 생성에 실패했습니다.');
    }
  }, [
    url,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    reconnectBackoffMultiplier,
    reconnectAttempt,
    addSystemMessage,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'User disconnected');
    }
    setIsReconnecting(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    setReconnectAttempt(0);
    setIsReconnecting(true);
    addSystemMessage('수동으로 재연결을 시도합니다...');
    setTimeout(() => connect(), 100);
  }, [disconnect, connect, addSystemMessage]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        addSystemMessage('서버에 연결되지 않았습니다.');
        return;
      }

      wsRef.current.send(message);
      setMessages(prev => [...prev, `전송: ${message}`]);
    },
    [addSystemMessage],
  );

  useEffect(() => {
    shouldReconnectRef.current = true;
    // 마운트에 소켓을 여는 것이 이 훅의 본질. connect는 생성 실패(catch)에서만
    // 동기 setState를 하므로 렌더 루프 위험이 없다. (react-hooks v7의
    // set-state-in-effect 대응 — v5에는 이 룰이 없어 이름을 특정하면 오히려
    // "룰 없음" 에러가 나므로 이름 없이 끈다)
    // eslint-disable-next-line
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  return {
    messages,
    isConnected,
    isReconnecting,
    reconnectAttempt,
    sendMessage,
    reconnect,
    disconnect,
    addSystemMessage,
  };
}
