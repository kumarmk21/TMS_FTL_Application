import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileDown, Loader2, BarChart3, RefreshCw, Filter, Calendar, Truck, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

type TxType = 'ATH' | 'BTH';

interface PaymentRecord {
  thc_id: string;
  thc_id_number: string | null;
  thc_date: string | null;
  lr_number: string | null;
  vehicle_number: string | null;
  vehicle_type: string | null;
  origin: string | null;
  destination: string | null;
  ven_act_name: string | null;
  thc_vendor: string | null;
  thc_amount: number | null;
  thc_advance_amount: number | null;
  thc_balance_amount: number | null;
  thc_tds_amount: number | null;
  thc_net_payable_amount: number | null;
  ath_date: string | null;
  ath_voucher_no: string | null;
  thc_balance_payment_date: string | null;
  thc_balance_pmt_utr_details: string | null;
  // computed
  tx_type: TxType;
  payment_date: string;
  amount_paid: number;
  reference_no: string;
  lr_date: string | null;
}

interface VendorOption {
  thc_vendor: string;
  ven_act_name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().split('T')[0];
const firstOfMonthStr = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
})();

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const inr = (v: number | null | undefined) =>
  v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';

// ─── BillPaymentReport ────────────────────────────────────────────────────────

export default function BillPaymentReport() {
  // Filters
  const [fromDate, setFromDate] = useState(firstOfMonthStr);
  const [toDate, setToDate] = useState(todayStr);
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'ATH' | 'BTH'>('all');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Export config (editable, pre-filled with defaults)
  const [exportMode, setExportMode] = useState('Bank Transfer');
  const [exportPaidThrough, setExportPaidThrough] = useState('HDFC BANK CA');

  // Results
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const fetchVendors = async () => {
      setVendorsLoading(true);
      try {
        const { data } = await supabase
          .from('thc_details')
          .select('thc_vendor, ven_act_name')
          .not('thc_vendor', 'is', null)
          .not('ven_act_name', 'is', null)
          .or('ath_date.not.is.null,thc_balance_payment_date.not.is.null');

        const seen = new Set<string>();
        const unique: VendorOption[] = [];
        for (const row of data || []) {
          if (row.thc_vendor && !seen.has(row.thc_vendor)) {
            seen.add(row.thc_vendor);
            unique.push({ thc_vendor: row.thc_vendor, ven_act_name: row.ven_act_name });
          }
        }
        unique.sort((a, b) => (a.ven_act_name || '').localeCompare(b.ven_act_name || ''));
        setVendors(unique);
      } catch (err) {
        console.error('Error fetching vendors:', err);
      } finally {
        setVendorsLoading(false);
      }
    };
    fetchVendors();
  }, []);

  const handleReset = () => {
    setFromDate(firstOfMonthStr);
    setToDate(todayStr);
    setTxTypeFilter('all');
    setSelectedVendor('');
    setRecords([]);
    setSearched(false);
  };

  const handleSearch = async () => {
    if (!fromDate || !toDate) { alert('Please select a date range.'); return; }
    setLoading(true);
    setRecords([]);

    const SELECT =
      'thc_id, thc_id_number, thc_date, lr_number, vehicle_number, vehicle_type, origin, destination, ' +
      'ven_act_name, thc_vendor, thc_amount, thc_advance_amount, thc_balance_amount, ' +
      'thc_tds_amount, thc_net_payable_amount, ath_date, ath_voucher_no, ' +
      'thc_balance_payment_date, thc_balance_pmt_utr_details';

    try {
      const combined: PaymentRecord[] = [];

      // ── ATH Paid ──────────────────────────────────────────────────────────
      if (txTypeFilter === 'all' || txTypeFilter === 'ATH') {
        let q = supabase
          .from('thc_details')
          .select(SELECT)
          .not('ath_date', 'is', null)
          .gte('ath_date', fromDate)
          .lte('ath_date', toDate);
        if (selectedVendor) q = q.eq('thc_vendor', selectedVendor);
        const { data, error } = await q.order('ath_date', { ascending: false });
        if (error) throw error;
        for (const r of data || []) {
          combined.push({
            ...r,
            tx_type: 'ATH',
            payment_date: r.ath_date,
            amount_paid: r.thc_advance_amount ?? 0,
            reference_no: r.ath_voucher_no ?? '',
          });
        }
      }

      // ── BTH Paid ──────────────────────────────────────────────────────────
      if (txTypeFilter === 'all' || txTypeFilter === 'BTH') {
        let q = supabase
          .from('thc_details')
          .select(SELECT)
          .not('thc_balance_payment_date', 'is', null)
          .gte('thc_balance_payment_date', fromDate)
          .lte('thc_balance_payment_date', toDate);
        if (selectedVendor) q = q.eq('thc_vendor', selectedVendor);
        const { data, error } = await q.order('thc_balance_payment_date', { ascending: false });
        if (error) throw error;
        for (const r of data || []) {
          combined.push({
            ...r,
            tx_type: 'BTH',
            payment_date: r.thc_balance_payment_date,
            amount_paid: r.thc_net_payable_amount ?? r.thc_balance_amount ?? 0,
            reference_no: r.thc_balance_pmt_utr_details ?? '',
          });
        }
      }

      // Sort by payment date descending
      combined.sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1));

      // ── Enrich with LR Date from booking_lr ──────────────────────────────
      const lrNums = [...new Set(combined.map(r => r.lr_number).filter(Boolean))] as string[];
      const lrDateMap = new Map<string, string>();
      if (lrNums.length > 0) {
        const { data: lrData } = await supabase
          .from('booking_lr')
          .select('manual_lr_no, lr_date')
          .in('manual_lr_no', lrNums);
        for (const row of lrData || []) {
          if (row.manual_lr_no && row.lr_date) lrDateMap.set(row.manual_lr_no, row.lr_date);
        }
      }
      const enriched = combined.map(r => ({ ...r, lr_date: lrDateMap.get(r.lr_number ?? '') ?? null }));

      setRecords(enriched);
      setSearched(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  const buildRows = () =>
    records.map((r, i) => ({
      'Payment Number': `BTH${50001 + i}`,
      'Date': r.payment_date || '',
      'Vendor Name': r.ven_act_name || '',
      'Mode': exportMode,
      'Description': r.thc_id_number ? `THC-${r.thc_id_number}` : '',
      'Exchange Rate': 1.00,
      'Amount': r.amount_paid,
      'Paid Through': exportPaidThrough,
      'Tax Account': '',
      'Reference Number': r.reference_no,
      'Bill Number': r.lr_number || '',
      'Bill Amount': r.thc_amount ?? '',
      'Reverse Charge Tax Rate': '',
      'Reverse Charge Tax Type': '',
      'Reverse Charge Tax Name': '',
      'Payment Type': 'Bill Payment',
      'GST Treatment': 'business_none',
      'GST Identification Number (GSTIN)': '',
      'Destination of Supply': 'MH',
      'Description of Supply': '',
      'TDS Name': '',
      'TDS Percentage': '',
      'TDS Section Code': '',
      'TDS Amount': r.tx_type === 'BTH' ? (r.thc_tds_amount ?? '') : '',
      'Bill Date': r.lr_date || '',
      'Transaction Type': r.tx_type,
      'LR Number': r.lr_number || '',
      'Vehicle Number': r.vehicle_number || '',
      'Vehicle Type': r.vehicle_type || '',
      'Origin': r.origin || '',
      'Destination': r.destination || '',
    }));

  const handleExportXlsx = () => {
    if (!records.length) return;
    const rows = buildRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 12) }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bill Payment Report');
    XLSX.writeFile(wb, `Bill_Payment_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const handleExportCsv = () => {
    if (!records.length) return;
    const rows = buildRows();
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.map(escape).join(','), ...rows.map(r => headers.map(h => escape((r as Record<string, unknown>)[h])).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_Payment_Report_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const athRecords = records.filter(r => r.tx_type === 'ATH');
  const bthRecords = records.filter(r => r.tx_type === 'BTH');
  const totalATH = athRecords.reduce((s, r) => s + r.amount_paid, 0);
  const totalBTH = bthRecords.reduce((s, r) => s + r.amount_paid, 0);
  const totalAmount = totalATH + totalBTH;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-xl">
          <BarChart3 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill Payment Report</h1>
          <p className="text-sm text-gray-500">ATH and BTH vendor payment records with Zoho Books export</p>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Filter className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Search Criteria</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* From Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              From Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              To Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vendor</label>
            {vendorsLoading ? (
              <div className="flex items-center gap-2 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading...</span>
              </div>
            ) : (
              <select
                value={selectedVendor}
                onChange={e => setSelectedVendor(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">All Vendors</option>
                {vendors.map(v => (
                  <option key={v.thc_vendor} value={v.thc_vendor}>{v.ven_act_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Transaction Type</label>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {(['all', 'ATH', 'BTH'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTxTypeFilter(t)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    txTypeFilter === t
                      ? t === 'ATH' ? 'bg-blue-600 text-white shadow-sm' : t === 'BTH' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'all' ? 'All' : t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Export Config */}
        <div className="border-t border-gray-100 pt-4 mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Export Settings (Zoho Books)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mode</label>
              <input
                type="text"
                value={exportMode}
                onChange={e => setExportMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Paid Through</label>
              <input
                type="text"
                value={exportPaidThrough}
                onChange={e => setExportPaidThrough(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Payment Type = <span className="font-medium text-gray-600">Bill Payment</span>
            {' · '}GST Treatment = <span className="font-medium text-gray-600">business_none</span>
            {' · '}Exchange Rate = <span className="font-medium text-gray-600">1.00</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={handleSearch}
            disabled={loading || !fromDate || !toDate}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {searched && records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Payments', value: records.length, color: 'bg-gray-50 border-gray-200', text: 'text-gray-800' },
            { label: 'ATH Payments', value: athRecords.length, color: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
            { label: 'BTH Payments', value: bthRecords.length, color: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
            { label: 'Total Amount', value: inr(totalAmount), color: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} border rounded-xl px-5 py-4`}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-xl font-black mt-1 ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {searched && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900">
                Results
                <span className="ml-1.5 text-sm font-normal text-gray-500">
                  ({records.length} record{records.length !== 1 ? 's' : ''})
                </span>
              </h2>
              {records.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>ATH: <strong className="text-blue-700">{inr(totalATH)}</strong></span>
                  <span>BTH: <strong className="text-amber-700">{inr(totalBTH)}</strong></span>
                  <span>Total: <strong className="text-gray-900">{inr(totalAmount)}</strong></span>
                </div>
              )}
            </div>
            {records.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={handleExportXlsx}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Export Excel
                </button>
              </div>
            )}
          </div>

          {records.length === 0 ? (
            <div className="py-16 text-center">
              <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No payment records found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your date range or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      '#', 'Date', 'Type', 'THC No.', 'LR Number', 'Vendor Name',
                      'Vehicle No.', 'Vehicle Type', 'Route', 'THC Amount', 'Amount Paid', 'TDS', 'Reference No.', 'Bill Date',
                    ].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {records.map((r, i) => (
                    <tr key={`${r.thc_id}-${r.tx_type}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-800">{fmtDate(r.payment_date)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          r.tx_type === 'ATH'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          <Truck className="w-3 h-3" />
                          {r.tx_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {r.thc_id_number || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.lr_number || '-'}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate" title={r.ven_act_name || ''}>
                        {r.ven_act_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.vehicle_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.vehicle_type || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.origin || r.destination ? (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            {r.origin || '-'}
                            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            {r.destination || '-'}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">
                        {inr(r.thc_amount)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`text-sm font-bold ${r.tx_type === 'ATH' ? 'text-blue-700' : 'text-amber-700'}`}>
                          {inr(r.amount_paid)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">
                        {r.tx_type === 'BTH' && r.thc_tds_amount ? inr(r.thc_tds_amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{r.reference_no || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.thc_date)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                    <td colSpan={8} className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Totals ({records.length} records)
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {inr(records.reduce((s, r) => s + (r.thc_amount || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">{inr(totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {inr(records.reduce((s, r) => s + (r.thc_tds_amount || 0), 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
          <BarChart3 className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Use the search panel above to find payment records</p>
          <p className="text-sm text-gray-400 mt-1">Defaults to the current month</p>
        </div>
      )}
    </div>
  );
}
