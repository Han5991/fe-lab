import { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

/**
 * WebSocket 클라이언트 데모 페이지
 * 순수 브라우저 WebSocket API를 사용하여 서버와 통신
 * 자동 재연결 기능 포함
 */
export default function SocketDemo() {
  const [inputMessage, setInputMessage] = useState('');

  const {
    messages,
    isConnected,
    isReconnecting,
    reconnectAttempt,
    sendMessage,
    reconnect,
    disconnect,
  } = useWebSocket({
    url: 'ws://localhost:3001',
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 1000,
    reconnectBackoffMultiplier: 1.5,
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    sendMessage(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>WebSocket 데모 (재연결 기능 포함)</h1>

      {/* 연결 상태 */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            padding: '10px',
            backgroundColor: isConnected
              ? '#d4edda'
              : isReconnecting
                ? '#fff3cd'
                : '#f8d7da',
            color: isConnected
              ? '#155724'
              : isReconnecting
                ? '#856404'
                : '#721c24',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>
              상태:{' '}
              {isConnected
                ? '✅ 연결됨'
                : isReconnecting
                  ? `🔄 재연결 중... (${reconnectAttempt}/5)`
                  : '❌ 연결 끊김'}
            </strong>
            {isReconnecting && (
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                자동으로 재연결을 시도하고 있습니다...
              </div>
            )}
          </div>

          {/* 재연결/연결 끊기 버튼 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isConnected && !isReconnecting && (
              <button
                onClick={reconnect}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🔄 재연결
              </button>
            )}
            {isConnected && (
              <button
                onClick={disconnect}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🔌 연결 끊기
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '10px',
            height: '400px',
            overflowY: 'auto',
            backgroundColor: '#f9f9f9',
          }}
        >
          {messages.length === 0 ? (
            <p style={{ color: '#999' }}>메시지가 없습니다.</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  padding: '8px',
                  marginBottom: '4px',
                  backgroundColor: msg.startsWith('[시스템]')
                    ? '#e7f3ff'
                    : msg.startsWith('전송:')
                      ? '#fff3cd'
                      : '#fff',
                  borderRadius: '4px',
                  borderLeft: msg.startsWith('[시스템]')
                    ? '3px solid #0066cc'
                    : msg.startsWith('전송:')
                      ? '3px solid #ff9800'
                      : '3px solid #4caf50',
                }}
              >
                {msg}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 메시지 입력 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요..."
          disabled={!isConnected}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !inputMessage.trim()}
          style={{
            padding: '10px 20px',
            backgroundColor:
              isConnected && inputMessage.trim() ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor:
              isConnected && inputMessage.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          전송
        </button>
      </div>

      {/* 상세 정보 */}
      <div
        style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}
      >
        <h2>WebSocket 연결 상세 정보</h2>
        <ul>
          <li>서버 주소: ws://localhost:3001</li>
          <li>프로토콜: WebSocket (RFC 6455)</li>
          <li>
            연결 상태:{' '}
            {isConnected
              ? '✅ OPEN'
              : isReconnecting
                ? '🔄 RECONNECTING'
                : '❌ CLOSED'}
          </li>
          <li>메시지 수: {messages.length}</li>
          <li>자동 재연결: ✅ 활성화 (최대 5회 시도)</li>
          <li>재연결 간격: 1초 (exponential backoff 1.5배)</li>
        </ul>

        <h3 style={{ marginTop: '20px' }}>재연결 테스트</h3>
        <ol>
          <li>연결된 상태에서 서버를 종료하세요 (Ctrl+C)</li>
          <li>자동으로 재연결 시도를 확인하세요</li>
          <li>서버를 다시 시작하면 자동으로 연결됩니다</li>
          <li>또는 "재연결" 버튼으로 수동 재연결 가능</li>
        </ol>
      </div>
    </div>
  );
}
