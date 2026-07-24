import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Upload,
  Plus,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreateVendorPaymentModal } from '../components/modals/CreateVendorPaymentModal';
import { ConfirmPaymentModal } from '../components/modals/ConfirmPaymentModal';

export interface VendorPayment {
  id: string;
  vendor_name: string;
  vendor_id: string;
  bill_amount: number;
  payment_date: string;
  payment_type: 'ATH' | 'BTH';
  status: 'pending' | 'processing' | 'posted' | 'failed';
  zoho_payment_id: string | null;
  reference_number: string | null;
  bill_id: string | null;
  notes: string | null;
  error_message: string | null;
  posted_at: string | null;
  created_at: string;
}

interface Settings {
  default_bank_account: string;
  auto_post: boolean;
  ath_requires_approval: boolean;
  bth_requires_approval: boolean;
}

const inr = (v: number) =>
  v != null ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const typeBadge = (type: 'ATH' | 'BTH') => {
  if (type === 'ATH') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">ATH</span>;
  }
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">BTH</span>;
};

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    processing: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Loader2 },
    posted: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  };
  const s = map[status] || map.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export function VendorPaymentsDashboard() {
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmPayment, setConfirmPayment] = useState<VendorPayment | null>(null);
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-api`;

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('vendor_payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setPayments((data || []) as VendorPayment[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchPayments();
    fetchSettings();
  }, [fetchPayments, fetchSettings]);

  const pendingPayments = payments.filter((p) => p.status === 'pending' || p.status === 'failed');
  const totalPending = pendingPayments.reduce((s, p) => s + p.bill_amount, 0);
  const athPending = pendingPayments.filter((p) => p.payment_type === 'ATH');
  const bthPending = pendingPayments.filter((p) => p.payment_type === 'BTH');

  const postPayment = async (payment: VendorPayment) => {
    setPosting(true);
    try {
      // Mark as processing
      await supabase
        .from('vendor_payments')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', payment.id);

      const res = await fetch(`${apiUrl}?action=create-vendor-payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendor_id: payment.vendor_id,
          vendor_name: payment.vendor_name,
          amount: payment.bill_amount,
          payment_date: payment.payment_date,
          payment_type: payment.payment_type,
          reference_number: payment.reference_number || `${payment.payment_type}-${Date.now()}`,
          notes: payment.notes || '',
          bill_id: payment.bill_id,
          bank_account_name: settings?.default_bank_account || 'HDFC Bank CA',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await supabase
          .from('vendor_payments')
          .update({
            status: 'posted',
            zoho_payment_id: data.zoho_payment_id,
            posted_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);
        showToast('success', `Payment of ${inr(payment.bill_amount)} to ${payment.vendor_name} posted to Zoho Books successfully.`);
      } else {
        await supabase
          .from('vendor_payments')
          .update({
            status: 'failed',
            error_message: data.error || 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);
        showToast('error', data.error || 'Failed to post payment to Zoho Books.');
      }
      await fetchPayments();
    } catch (err: any) {
      await supabase
        .from('vendor_payments')
        .update({
          status: 'failed',
          error_message: err.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
      showToast('error', err.message || 'Network error while posting payment.');
      await fetchPayments();
    } finally {
      setPosting(false);
      setConfirmPayment(null);
    }
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <CreditCard className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Bill Payments</h1>
            <p className="text-sm text-gray-500">Manage ATH and BTH vendor payments to Zoho Books</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Payment
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Pending Payments</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendingPayments.length}</p>
          <p className="text-xs text-gray-400 mt-1">{inr(totalPending)} total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">ATH Pending</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">ATH</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{athPending.length}</p>
          <p className="text-xs text-gray-400 mt-1">{inr(athPending.reduce((s, p) => s + p.bill_amount, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">BTH Pending</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">BTH</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{bthPending.length}</p>
          <p className="text-xs text-gray-400 mt-1">{inr(bthPending.reduce((s, p) => s + p.bill_amount, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Bank Account</span>
            <CreditCard className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-900">{settings?.default_bank_account || 'HDFC Bank CA'}</p>
          <p className="text-xs text-gray-400 mt-1">{settings?.auto_post ? 'Auto-post ON' : 'Manual posting'}</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Pending payments table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pending & Failed Payments</h2>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : pendingPayments.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No pending payments. All caught up!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Payment Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Error</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.vendor_name}</td>
                    <td className="px-4 py-3">{typeBadge(p.payment_type)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{inr(p.bill_amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(p.payment_date)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.reference_number || '-'}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-xs text-red-600 max-w-xs truncate" title={p.error_message || ''}>
                      {p.error_message || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setConfirmPayment(p)}
                        disabled={posting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Post to Zoho
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create payment modal */}
      {showCreateModal && (
        <CreateVendorPaymentModal
          settings={settings}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchPayments();
          }}
        />
      )}

      {/* Confirm payment modal */}
      {confirmPayment && (
        <ConfirmPaymentModal
          payment={confirmPayment}
          posting={posting}
          onConfirm={() => postPayment(confirmPayment)}
          onCancel={() => setConfirmPayment(null)}
        />
      )}
    </div>
  );
}

export default VendorPaymentsDashboard;
