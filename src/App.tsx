import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import ZohoCallback from './pages/ZohoCallback';

function AppContent() {
  // Handle Zoho OAuth callback before any auth check
  if (window.location.pathname === '/auth/zoho/callback') {
    return <ZohoCallback />;
  }

  const { user } = useAuth();

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
