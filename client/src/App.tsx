import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Auth } from './pages/Auth';
import { ResourceDetails } from './pages/ResourceDetails';
import { CreateResource } from './pages/CreateResource';
import { Chat } from './pages/Chat';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';

const PageSkeleton: React.FC = () => (
  <div className="min-h-screen w-full bg-dark-950 flex flex-col text-left animate-pulse">
    {/* Navbar Shimmer */}
    <header className="h-16 w-full border-b border-dark-850 bg-dark-900/60 backdrop-blur-md px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-lg bg-dark-800/40" />
        <div className="h-4 w-28 bg-dark-800/40 rounded" />
      </div>
      <div className="flex gap-6 items-center">
        <div className="h-3.5 w-16 bg-dark-800/40 rounded" />
        <div className="h-3.5 w-20 bg-dark-800/40 rounded" />
        <div className="h-8 w-8 rounded-full bg-dark-800/40" />
      </div>
    </header>

    {/* Body Content Shimmer */}
    <div className="mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
      {/* Left Column Shimmer */}
      <aside className="lg:col-span-4 flex flex-col gap-6">
        <div className="glass-card p-6 flex flex-col items-center">
          <div className="h-20 w-20 rounded-2xl bg-dark-800/40 mb-4" />
          <div className="h-4.5 w-32 bg-dark-800/40 rounded mb-2" />
          <div className="h-3 w-40 bg-dark-800/40 rounded mb-4" />
          <div className="h-6 w-28 rounded-full bg-dark-800/40" />
        </div>
      </aside>

      {/* Right Column Shimmer */}
      <main className="lg:col-span-8 flex flex-col gap-6">
        <div className="h-10 border-b border-dark-850 flex gap-4">
          <div className="h-5 w-24 bg-dark-800/40 rounded" />
          <div className="h-5 w-24 bg-dark-800/40 rounded" />
        </div>
        <div className="flex flex-col gap-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass-card p-5 flex flex-col sm:flex-row justify-between gap-4 bg-dark-950/20">
              <div className="flex gap-4 items-center">
                <div className="h-14 w-11 bg-dark-800/40 rounded" />
                <div className="flex flex-col gap-2">
                  <div className="h-3 bg-dark-800/40 rounded w-16" />
                  <div className="h-4 bg-dark-800/40 rounded w-48" />
                  <div className="h-2.5 bg-dark-800/40 rounded w-32" />
                </div>
              </div>
              <div className="h-6 w-20 bg-dark-800/40 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  </div>
);

// Route protections
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/resources/:id" element={<ResourceDetails />} />
          
          {/* Protected student routes */}
          <Route path="/create-listing" element={
            <ProtectedRoute>
              <CreateResource />
            </ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Admin exclusive routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      
      {/* Footer layout */}
      <footer className="border-t border-dark-850/60 bg-dark-950 py-6 text-center text-xs text-dark-500 mt-auto">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>&copy; {new Date().getFullYear()} BookBridge Academic Exchange. All Rights Reserved.</span>
          <span className="flex items-center gap-1.5">
            Designed for Campus Circular Economy
          </span>
        </div>
      </footer>
    </div>
  );
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 
  (window.location.hostname === 'localhost' 
    ? '127562380182-5ft23evtg7388f1at5uac3g79kt4on9g.apps.googleusercontent.com' 
    : '');

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <AppContent />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
