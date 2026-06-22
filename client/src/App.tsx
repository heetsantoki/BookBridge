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
import { RefreshCw } from 'lucide-react';

// Google Client ID fallback for local development checks
const GOOGLE_CLIENT_ID = window.location.hostname === 'localhost' 
  ? '935639145695-mockclientid.apps.googleusercontent.com' 
  : ''; 

// Route protections
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark-950">
        <RefreshCw className="h-8 w-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark-950">
        <RefreshCw className="h-8 w-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark-950">
        <RefreshCw className="h-8 w-8 text-brand-400 animate-spin" />
      </div>
    );
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
