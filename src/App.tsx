import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import ZohoCallback from './pages/ZohoCallback';

function AppContent() {
  const { user } = useAuth();

  // Zoho OAuth redirects back to root with ?code= param
  const params = new URLSearchParams(window.location.search);
  const isZohoCallback =
    window.location.pathname === '/auth/zoho/callback' ||
    params.has('code') && params.has('location');

  if (isZohoCallback) {
    return <ZohoCallback />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
