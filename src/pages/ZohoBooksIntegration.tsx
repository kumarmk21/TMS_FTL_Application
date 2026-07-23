import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Link2, Unlink, Loader2, CheckCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ConnectionStatus {
  connected: boolean;
  connected_at?: string;
  expires_at?: string;
  api_domain?: string;
  location?: string;
}

export default function ZohoBooksIntegration() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const oauthUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-oauth`;
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-api`;

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${oauthUrl}?action=status`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) throw new Error(`Failed to check status (${res.status})`);
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to check connection status');
    } finally {
      setLoading(false);
    }
  }, [oauthUrl]);

  useEffect(() => {
    fetchStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('zoho') === 'connected' || params.get('status') === 'connected') {
      setSuccess('Successfully connected to Zoho Books!');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setSuccess(''), 5000);
    }
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      const res = await fetch(`${oauthUrl}?action=authorize`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) throw new Error('Failed to get authorization URL');
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start authorization');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Zoho Books? You will need to re-authorize to use the integration.')) return;

    setDisconnecting(true);
    setError('');
    try {
      const res = await fetch(`${oauthUrl}?action=disconnect`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      setSuccess('Disconnected from Zoho Books.');
      setTimeout(() => setSuccess(''), 5000);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <BookOpen className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zoho Books Integration</h1>
          <p className="text-sm text-gray-500">Connect your Zoho Books account to sync invoices, payments, and financial data</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            <span className="ml-3 text-gray-500">Checking connection status...</span>
          </div>
        ) : status?.connected ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Connected to Zoho Books</h3>
                <p className="text-sm text-green-700">Your account is linked and ready to sync data.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Connected Since</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(status.connected_at)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Token Expires At</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(status.expires_at)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">API Domain</p>
                <p className="text-sm font-semibold text-gray-900">{status.api_domain || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Data Center</p>
                <p className="text-sm font-semibold text-gray-900">{status.location || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                Disconnect
              </button>
              <button
                onClick={fetchStatus}
                className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Status
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="p-2 bg-gray-200 rounded-full">
                <Link2 className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Not Connected</h3>
                <p className="text-sm text-gray-600">Click the button below to authorize access to your Zoho Books account.</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">What happens when you connect?</h4>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  You'll be redirected to Zoho's secure login page
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  Grant access to your Zoho Books organization
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  You'll be redirected back here with the connection active
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  Access tokens auto-refresh — no repeated logins needed
                </li>
              </ul>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Link2 className="w-5 h-5" />}
              Connect to Zoho Books
            </button>
          </div>
        )}
      </div>

      {status?.connected && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">API Access</h2>
            <a
              href="https://www.zoho.com/books/api/v3/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              API Docs <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            The Zoho Books API proxy is active. API calls are made through the secure edge function which handles
            authentication and automatic token refresh.
          </p>
          <div className="p-3 bg-gray-900 rounded-lg overflow-x-auto">
            <code className="text-xs text-green-400 font-mono">
              POST {apiUrl}
              <br />
              <span className="text-gray-400">{'{ "method": "GET", "path": "/books/v3/invoices", "query": { "organization_id": "XXXX" } }'}</span>
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
