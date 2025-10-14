import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ErrorTest, ErrorDesign, ToastExamplePage, SocketDemo } from '@/pages';
import './index.css';
import { ErrorBoundary } from '@/components';
import { queryClient } from './lib/queryClient';
import { worker } from './mocks/browser';

const root = document.getElementById('root');

async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // WebSocket 연결은 MSW가 가로채지 않도록 설정
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
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
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>,
  );
});
