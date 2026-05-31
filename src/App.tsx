import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { invoke } from '@tauri-apps/api/core';
import MainLayout from './pages/MainLayout';
import NotFound from './pages/NotFound';

export default function App() {
  useEffect(() => {
    // Dev-only IPC smoke test; only runs inside the Tauri webview.
    if (import.meta.env.DEV && '__TAURI_INTERNALS__' in window) {
      invoke<string>('ping')
        .then((r) => console.log('[ipc] ping ->', r))
        .catch((e) => console.error('[ipc] ping failed', e));
    }
  }, []);

  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
