import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import App from './App';
import { About, ErrorTest } from '@/pages';
import { ToastExamplePage } from '@pages/toast-example';
import './index.css';
import { ErrorBoundary } from '@/components';

const root = document.getElementById('root');

ReactDOM.createRoot(root!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/about" element={<About />} />
        <Route path="/error-test" element={<ErrorTest />} />
        <Route path="/toast" element={<ToastExamplePage />} />
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>,
);
