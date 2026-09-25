import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import {
  ErrorTest,
  ErrorDesign,
  ToastExamplePage,
  SocketDemo,
  WebSocketQueryDemo,
} from '@/pages';
import './index.css';
import { ErrorBoundary } from '@/components';
import { queryClient } from './lib/queryClient';

const root = document.getElementById('root');

async function enableMocking() {
  // 목 API는 개발 서버에서만 띄운다. 동적 import라 프로덕션 번들에는 msw가 실리지 않는다
  if (!import.meta.env.DEV) return;

  const { worker } = await import('./mocks/browser');
  // WebSocket 연결은 MSW가 가로채지 않도록 설정
  await worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking()
  // 서비스 워커 등록이 실패해도(비보안 LAN 출처 등) 앱은 그린다 — 목 없이 실제 요청으로 간다
  .catch(error => {
    console.error('MSW를 시작하지 못해 목 없이 렌더링합니다.', error);
  })
  .then(() => {
    ReactDOM.createRoot(root!).render(
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/error-test" element={<ErrorTest />} />
              <Route path="/error-design" element={<ErrorDesign />} />
              <Route path="/toast" element={<ToastExamplePage />} />
              <Route path="/socket" element={<SocketDemo />} />
              <Route
                path="/stok-ticker-query"
                element={<WebSocketQueryDemo />}
              />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>,
    );
  });
