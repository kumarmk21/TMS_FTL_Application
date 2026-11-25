import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import ZohoCallback from './pages/ZohoCallback';

function AppContent() {
  const { user } = useAuth();

  // Zoho always appends both `code` and `location` params on its redirect;
  // requiring both avoids clashing with other flows that use only `code`.
  const zohoParams = new URLSearchParams(window.location.search);
  const zohoRedirect =
    zohoParams.get('code') !== null && zohoParams.get('location') !== null;

  if (window.location.pathname === '/auth/zoho/callback' || zohoRedirect) {
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
