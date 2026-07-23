import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Link2, Unlink, Loader2, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Users, Upload, Download, ArrowRight } from 'lucide-react';

interface ConnectionStatus {
  connected: boolean;
  connected_at?: string;
  expires_at?: string;
  api_domain?: string;
  location?: string;
}

interface SyncResult {
  zohoCount: number;
  localCount: number;
  matched: number;
  unmatched: number;
  pushed: number;
  details: Array<{
    customer_id: string;
    customer_name: string;
    action: string;
    zoho_id?: string;
    status: string;
  }>;
}

interface SyncStats {
  totalLocal: number;
  linked: number;
  unlinked: number;
}

export default function ZohoBooksIntegration() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncFilter, setSyncFilter] = useState<'all' | 'linked' | 'pushed' | 'error'>('all');

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
      if (data.connected) {
        await fetchSyncStats();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check connection status');
    } finally {
      setLoading(false);
    }
  }, [oauthUrl]);

  const fetchSyncStats = useCallback(async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const sb = createClient(supabaseUrl, supabaseAnonKey);

      const { count: total } = await sb
        .from('customer_master')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: linked } = await sb
        .from('customer_master')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('zoho_customer_id', 'is', null);

      setSyncStats({
        totalLocal: total || 0,
        linked: linked || 0,
        unlinked: (total || 0) - (linked || 0),
      });
    } catch {
      // non-critical
    }
  }, []);

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

  const handleSyncCustomers = async () => {
    setSyncing(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await fetch(`${apiUrl}?action=sync-customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Sync failed (${res.status})`);
      }
      setSyncResult(data);
      setSuccess(`Sync complete: ${data.matched} linked, ${data.pushed} pushed to Zoho, ${data.unmatched - data.pushed} could not be matched.`);
      setTimeout(() => setSuccess(''), 8000);
      await fetchSyncStats();
    } catch (err: any) {
      setError(err.message || 'Failed to sync customers');
    } finally {
      setSyncing(false);
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

  const filteredDetails = syncResult
    ? syncResult.details.filter(d => {
        if (syncFilter === 'all') return true;
        if (syncFilter === 'linked') return d.action === 'link' && d.status === 'linked';
        if (syncFilter === 'pushed') return d.action === 'push' && d.status === 'pushed';
        if (syncFilter === 'error') return d.status.includes('error') || d.status.includes('not in Zoho');
        return true;
      })
    : [];

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

      {/* Connection Status Card */}
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

      {/* Customer Sync Card */}
      {status?.connected && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">Customer Sync</h2>
              <p className="text-sm text-gray-500">Sync your local customers with Zoho Books contacts</p>
            </div>
          </div>

          {/* Sync Stats */}
          {syncStats && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{syncStats.totalLocal}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Customers</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">{syncStats.linked}</p>
                <p className="text-xs text-green-600 mt-0.5">Linked to Zoho</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-700">{syncStats.unlinked}</p>
                <p className="text-xs text-amber-600 mt-0.5">Not Yet Linked</p>
              </div>
            </div>
          )}

          {/* Sync Button */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleSyncCustomers}
              disabled={syncing}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? 'Syncing...' : 'Sync Customers Now'}
            </button>
          </div>

          {/* Sync Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">How sync works</h4>
            <ul className="space-y-1.5 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Fetches all customer contacts from Zoho Books
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Matches local customers to Zoho contacts by GSTIN (primary) or name (fallback)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Unmatched local customers are automatically pushed to Zoho Books as new contacts
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Links are stored in <code className="text-xs bg-blue-100 px-1 rounded">zoho_customer_id</code> column
              </li>
            </ul>
          </div>

          {/* Sync Results */}
          {syncResult && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h4 className="text-sm font-semibold text-gray-900">Sync Results</h4>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-600">
                      Zoho: <strong>{syncResult.zohoCount}</strong>
                    </span>
                    <span className="text-gray-600">
                      Local: <strong>{syncResult.localCount}</strong>
                    </span>
                    <span className="text-green-700">
                      Linked: <strong>{syncResult.matched}</strong>
                    </span>
                    <span className="text-blue-700">
                      Pushed: <strong>{syncResult.pushed}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-200">
                {(['all', 'linked', 'pushed', 'error'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSyncFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      syncFilter === f
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' && `All (${syncResult.details.length})`}
                    {f === 'linked' && `Linked (${syncResult.details.filter(d => d.action === 'link' && d.status === 'linked').length})`}
                    {f === 'pushed' && `Pushed (${syncResult.details.filter(d => d.action === 'push' && d.status === 'pushed').length})`}
                    {f === 'error' && `Errors (${syncResult.details.filter(d => d.status.includes('error') || d.status.includes('not in Zoho')).length})`}
                  </button>
                ))}
              </div>

              {/* Details Table */}
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer ID</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Zoho ID</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDetails.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          No records in this category
                        </td>
                      </tr>
                    ) : (
                      filteredDetails.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700 font-mono text-xs">{d.customer_id}</td>
                          <td className="px-4 py-2 text-gray-900">{d.customer_name}</td>
                          <td className="px-4 py-2">
                            {d.action === 'link' ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                <Link2 className="w-3 h-3" /> Link
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                                <Upload className="w-3 h-3" /> Push
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-500 font-mono text-xs">{d.zoho_id || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs ${
                              d.status === 'linked' ? 'text-green-700' :
                              d.status === 'pushed' ? 'text-blue-700' :
                              d.status.includes('error') ? 'text-red-700' :
                              'text-gray-500'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* API Access Card */}
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
              POST {apiUrl}?action=proxy
              <br />
              <span className="text-gray-400">{'{ "method": "GET", "path": "/books/v3/invoices" }'}</span>
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
