import { useState, useEffect, useCallback } from 'react';
import {
  History,
  FileDown,
  Loader2,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { supabase } from '../lib/supabase';
import type { VendorPayment } from './VendorPaymentsDashboard';

const inr = (v: number) =>
  v != null ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

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

export function VendorPaymentHistory() {
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ATH' | 'BTH'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'posted' | 'failed'>('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-api`;

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
      setError(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filtered = payments.filter((p) => {
    if (typeFilter !== 'all' && p.payment_type !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const handleExportExcel = () => {
    if (filtered.length === 0) return;
    const exportData = filtered.map((p, i) => ({
      'Sr.No': i + 1,
      'Vendor Name': p.vendor_name,
      'Bill Amount': p.bill_amount,
      'Payment Date': p.payment_date,
      'Payment Type': p.payment_type,
      'Status': p.status,
      'Zoho Payment ID': p.zoho_payment_id || '',
      'Reference Number': p.reference_number || '',
      'Notes': p.notes || '',
      'Error Message': p.error_message || '',
      'Posted At': p.posted_at || '',
      'Created At': p.created_at,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendor Payments');
    XLSX.writeFile(wb, `Vendor_Payment_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    if (filtered.length === 0) return;
    const tableHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1f2937; margin-bottom: 4px;">Vendor Payment History</h2>
          <p style="color: #6b7280; font-size: 12px; margin-bottom: 16px;">Generated on ${new Date().toLocaleString('en-IN')}</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Sr.</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Vendor</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Amount</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Date</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Type</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Status</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Zoho Payment ID</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Reference</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((p, i) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${i + 1}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${p.vendor_name}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">₹${p.bill_amount.toFixed(2)}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${fmtDate(p.payment_date)}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${p.payment_type}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${p.status}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${p.zoho_payment_id || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${p.reference_number || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${fmtDateTime(p.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    html2pdf().fromHtml(tableHtml).save(`Vendor_Payment_History_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleRetry = async (payment: VendorPayment) => {
    setRetryingId(payment.id);
    try {
      await supabase
        .from('vendor_payments')
        .update({ status: 'pending', error_message: null, updated_at: new Date().toISOString() })
        .eq('id', payment.id);
      await fetchPayments();
    } catch {
      // non-critical
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <History className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
            <p className="text-sm text-gray-500">All vendor payment submissions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Filters:</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'ATH' | 'BTH')}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          >
            <option value="all">All</option>
            <option value="ATH">ATH</option>
            <option value="BTH">BTH</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'processing' | 'posted' | 'failed')}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="posted">Posted</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No payment records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Sr.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Vendor Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Bill Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Payment Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Zoho Payment ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.vendor_name}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{inr(p.bill_amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(p.payment_date)}</td>
                    <td className="px-4 py-3">{typeBadge(p.payment_type)}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.zoho_payment_id || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.reference_number || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDateTime(p.created_at)}</td>
                    <td className="px-4 py-3 text-center">
                      {p.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(p)}
                          disabled={retryingId === p.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-medium hover:bg-yellow-100 disabled:opacity-50 transition-colors"
                        >
                          {retryingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default VendorPaymentHistory;
