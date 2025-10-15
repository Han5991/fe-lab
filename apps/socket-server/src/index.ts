import { createServer } from 'http';
import { WebSocketServer } from './websocket-server.js';

const PORT = 3001;

const httpServer = createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Server Running');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Origin 검증 옵션
// allowedOrigins를 설정하면 해당 출처만 허용
// null이면 모든 출처 허용 (개발 환경)
const wsServer = new WebSocketServer(httpServer, {
  allowedOrigins: ['http://localhost:5173'],
  sessionTimeout: 5 * 60 * 1000, // 5분 (기본값)
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server is ready for connections`);
});

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  wsServer.shutdown();
  httpServer.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  wsServer.shutdown();
  httpServer.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
