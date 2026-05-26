import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SummaryDetail from './pages/SummaryDetail';
import TranscriptionDetail from './pages/TranscriptionDetail';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/summary/:id"
            element={
              <ProtectedRoute>
                <SummaryDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transcription/:id"
            element={
              <ProtectedRoute>
                <TranscriptionDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
