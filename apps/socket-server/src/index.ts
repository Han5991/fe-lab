import { createServer } from 'http';
import { isLocalOrigin, WebSocketServer } from './websocket-server.ts';

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

// Origin 검증: ALLOWED_ORIGINS(쉼표 구분)가 있으면 그 목록만, 없으면 로컬 개발 출처만 허용
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',')
  .map(origin => origin.trim())
  .filter(origin => origin !== '');

const wsServer = new WebSocketServer(httpServer, {
  allowedOrigins:
    allowedOrigins && allowedOrigins.length > 0
      ? allowedOrigins
      : isLocalOrigin,
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
