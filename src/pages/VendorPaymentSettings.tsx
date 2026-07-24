import { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  CreditCard,
  Lock,
  Unlock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Settings {
  default_bank_account: string;
  auto_post: boolean;
  ath_requires_approval: boolean;
  bth_requires_approval: boolean;
}

interface ConnectionInfo {
  connected: boolean;
  connected_at?: string;
  api_domain?: string;
  location?: string;
  expires_at?: string;
}

export function VendorPaymentSettings() {
  const [settings, setSettings] = useState<Settings>({
    default_bank_account: 'HDFC Bank CA',
    auto_post: false,
    ath_requires_approval: true,
    bth_requires_approval: false,
  });
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const oauthUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-oauth`;

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('vendor_payment_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (data) setSettings(data as Settings);
    } catch {
      // non-critical
    }
  }, []);

  const fetchConnection = useCallback(async () => {
    try {
      const res = await fetch(`${oauthUrl}?action=status`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConnection(data);
      }
    } catch {
      // non-critical
    }
  }, [oauthUrl]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchConnection()]);
      setLoading(false);
    })();
  }, [fetchSettings, fetchConnection]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('vendor_payment_settings')
        .upsert({
          id: 1,
          default_bank_account: settings.default_bank_account,
          auto_post: settings.auto_post,
          ath_requires_approval: settings.ath_requires_approval,
          bth_requires_approval: settings.bth_requires_approval,
          updated_at: new Date().toISOString(),
        });

      if (err) throw err;
      showToast('success', 'Settings saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
      showToast('error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Payment Settings</h1>
          <p className="text-sm text-gray-500">Configure Zoho Books payment integration</p>
        </div>
      </div>

      {/* Zoho Connection Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Zoho Books Connection</h2>
        {connection?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Connected to Zoho Books</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-xs text-gray-500">API Domain</label>
                <p className="text-sm font-medium text-gray-900">{connection.api_domain || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Data Center</label>
                <p className="text-sm font-medium text-gray-900 uppercase">{connection.location || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Connected Since</label>
                <p className="text-sm font-medium text-gray-900">
                  {connection.connected_at ? new Date(connection.connected_at).toLocaleDateString('en-IN') : '-'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Token Expires</label>
                <p className="text-sm font-medium text-gray-900">
                  {connection.expires_at ? new Date(connection.expires_at).toLocaleDateString('en-IN') : '-'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-700">Not connected to Zoho Books. Connect from the Zoho Books Integration page first.</span>
          </div>
        )}
      </div>

      {/* Payment Settings */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payment Configuration</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Default Bank Account */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Default Bank Account</label>
          <div className="relative max-w-md">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={settings.default_bank_account}
              onChange={(e) => setSettings({ ...settings, default_bank_account: e.target.value })}
              placeholder="HDFC Bank CA"
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">This bank account name must match an account in your Zoho Books Chart of Accounts.</p>
        </div>

        {/* Auto-post toggle */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Auto-post payments on creation</h3>
            <p className="text-xs text-gray-500 mt-0.5">When enabled, payments are automatically posted to Zoho Books when created (unless approval is required).</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, auto_post: !settings.auto_post })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.auto_post ? 'bg-red-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.auto_post ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* ATH requires approval */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              <span className="inline-flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">ATH</span>
                payments require approval
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">When enabled, ATH (advance) payments are saved as pending and must be manually posted.</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, ath_requires_approval: !settings.ath_requires_approval })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.ath_requires_approval ? 'bg-red-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.ath_requires_approval ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* BTH requires approval */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              <span className="inline-flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">BTH</span>
                payments require approval
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">When enabled, BTH (post-delivery) payments are saved as pending and must be manually posted.</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, bth_requires_approval: !settings.bth_requires_approval })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.bth_requires_approval ? 'bg-red-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.bth_requires_approval ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default VendorPaymentSettings;
