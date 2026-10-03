import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App';
import { RepoProvider } from './context/RepoContext';
import Layout from './components/Layout';
import TreePage from './pages/TreePage';
import IssuesPage from './pages/IssuesPage';
import RepositorySummaryPage from './pages/RepositorySummaryPage';
import FrontendPreviewPage from './pages/FrontendPreviewPage';

// Suppress cross-origin "Script error." overlay from Monaco Editor workers
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.' || (event.message && event.message.includes('ResizeObserver'))) {
    event.stopImmediatePropagation();
  }
});

const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && (args[0].includes('Script error.') || args[0].includes('ResizeObserver'))) {
    return;
  }
  originalError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RepoProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/preview" element={<FrontendPreviewPage />} />
            <Route path="/summary" element={<RepositorySummaryPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/tree" element={<TreePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </RepoProvider>
  </React.StrictMode>
);
