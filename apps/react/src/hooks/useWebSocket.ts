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
  /** 서버 메시지마다 도착 순서대로 불린다. `messages` state는 렌더마다 합쳐지므로 메시지별 처리는 여기서 한다 */
  onMessage?: (data: string) => void;
  /** messages에 남길 최대 개수. 넘으면 오래된 것부터 버린다 (기본: 200) */
  maxMessages?: number;
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
    onMessage,
    maxMessages = 200,
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
  // 시도 횟수가 connect의 deps에 들어가면 재연결마다 connect identity가 바뀌어
  // 마운트 effect가 재실행되고, 타임아웃 쪽 connect와 합쳐져 소켓이 이중으로
  // 열린다. 판정·백오프는 ref로 읽고 state(reconnectAttempt)는 UI 표시용으로만
  // 쓴다.
  const reconnectAttemptRef = useRef(0);
  // 인라인 onMessage가 바뀔 때마다 소켓을 다시 열지 않게 ref로 읽는다
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  const appendMessage = useCallback(
    (message: string) => {
      setMessages(prev => [...prev, message].slice(-maxMessages));
    },
    [maxMessages],
  );

  const addSystemMessage = useCallback(
    (message: string) => {
      appendMessage(`[시스템] ${message}`);
    },
    [appendMessage],
  );

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // CONNECTING도 닫아야 나중에 열려 두 번째 연결이 되지 않는다. wsRef를 먼저 비워
  // 옛 소켓의 늦은 이벤트는 핸들러의 `wsRef.current !== ws` 가드에 걸린다.
  const closeCurrentSocket = useCallback((code: number, reason: string) => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (
      ws &&
      (ws.readyState === WebSocket.CONNECTING ||
        ws.readyState === WebSocket.OPEN)
    ) {
      ws.close(code, reason);
    }
  }, []);

  const connect = useCallback(() => {
    closeCurrentSocket(1000, 'Replaced by a new connection');
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptRef.current = 0;
        setReconnectAttempt(0);
        addSystemMessage('서버에 연결되었습니다.');
      };

      ws.onmessage = event => {
        if (wsRef.current !== ws) return;
        console.log('Received message:', event.data);
        const data = String(event.data);
        appendMessage(`수신: ${data}`);
        onMessageRef.current?.(data);
      };

      ws.onerror = error => {
        if (wsRef.current !== ws) return;
        console.error('WebSocket error:', error);
        addSystemMessage('연결 오류가 발생했습니다.');
      };

      ws.onclose = event => {
        if (wsRef.current !== ws) return;
        console.log('WebSocket disconnected', event);
        setIsConnected(false);
        wsRef.current = null;

        // 정상 종료(코드 1000)가 아니고 재연결이 활성화된 경우
        const attempt = reconnectAttemptRef.current;
        if (
          event.code !== 1000 &&
          shouldReconnectRef.current &&
          autoReconnect &&
          attempt < maxReconnectAttempts
        ) {
          setIsReconnecting(true);
          const delay =
            reconnectInterval * Math.pow(reconnectBackoffMultiplier, attempt);
          addSystemMessage(
            `연결이 끊어졌습니다. ${Math.round(delay / 1000)}초 후 재연결 시도... (${attempt + 1}/${maxReconnectAttempts})`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current += 1;
            setReconnectAttempt(reconnectAttemptRef.current);
            connectRef.current?.();
          }, delay);
        } else if (attempt >= maxReconnectAttempts) {
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
    addSystemMessage,
    appendMessage,
    closeCurrentSocket,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();
    const hadSocket = wsRef.current !== null;
    // 닫는 소켓의 close 이벤트는 가드에 걸려 무시되므로 상태는 여기서 정리한다
    closeCurrentSocket(1000, 'User disconnected');
    setIsConnected(false);
    setIsReconnecting(false);
    if (hadSocket) {
      addSystemMessage('서버와의 연결이 종료되었습니다.');
    }
  }, [clearReconnectTimeout, closeCurrentSocket, addSystemMessage]);

  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    reconnectAttemptRef.current = 0;
    setReconnectAttempt(0);
    setIsReconnecting(true);
    addSystemMessage('수동으로 재연결을 시도합니다...');
    // 언마운트·disconnect가 취소할 수 있게 같은 ref로 예약한다
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connectRef.current?.();
    }, 100);
  }, [disconnect, addSystemMessage]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        addSystemMessage('서버에 연결되지 않았습니다.');
        return;
      }

      wsRef.current.send(message);
      appendMessage(`전송: ${message}`);
    },
    [addSystemMessage, appendMessage],
  );

  useEffect(() => {
    shouldReconnectRef.current = true;
    // 마운트에 소켓을 여는 것이 이 훅의 본질. connect는 생성 실패(catch)에서만
    // 동기 setState를 하므로 렌더 루프 위험이 없다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      closeCurrentSocket(1000, 'Component unmounted');
    };
  }, [connect, clearReconnectTimeout, closeCurrentSocket]);

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
