import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  FileDown,
  Loader2,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Search,
  AlertTriangle,
  Clock,
  Building2,
  TrendingDown,
  RefreshCw,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PendingTHC {
  thc_id: string;
  thc_id_number: string | null;
  thc_date: string | null;
  lr_number: string | null;
  vehicle_number: string | null;
  origin: string | null;
  destination: string | null;
  thc_gross_amount: number | null;
  thc_tds_amount: number | null;
  thc_net_payable_amount: number | null;
  thc_advance_amount: number | null;
  thc_balance_amount: number | null;
  bth_due_date: string | null;
  thc_vendor: string | null;
  ven_act_name: string | null;
}

interface VendorSummary {
  vendorId: string;
  vendorName: string;
  thcCount: number;
  totalGross: number;
  totalTDS: number;
  totalNetPayable: number;
  totalAdvance: number;
  totalBalancePending: number;
  earliestDueDate: string | null;
  overdueCount: number;
  records: PendingTHC[];
}

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = new Date().toISOString().split('T')[0];

function getDueDateStatus(dueDate: string | null): 'overdue' | 'due-soon' | 'ok' | 'none' {
  if (!dueDate) return 'none';
  const diff = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= 7) return 'due-soon';
  return 'ok';
}

export default function APReport() {
  const [records, setRecords] = useState<PendingTHC[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPendingPayables();
  }, []);

  const fetchPendingPayables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('thc_details')
        .select(
          'thc_id, thc_id_number, thc_date, lr_number, vehicle_number, origin, destination, thc_gross_amount, thc_tds_amount, thc_net_payable_amount, thc_advance_amount, thc_balance_amount, bth_due_date, thc_vendor, ven_act_name'
        )
        .is('thc_balance_payment_date', null)
        .gt('thc_balance_amount', 0)
        .order('bth_due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching pending payables:', err);
    } finally {
      setLoading(false);
    }
  };

  const vendorSummaries = useMemo<VendorSummary[]>(() => {
    const map = new Map<string, VendorSummary>();
    for (const r of records) {
      const vid = r.thc_vendor || 'unknown';
      const vname = r.ven_act_name || 'Unknown Vendor';
      if (!map.has(vid)) {
        map.set(vid, {
          vendorId: vid,
          vendorName: vname,
          thcCount: 0,
          totalGross: 0,
          totalTDS: 0,
          totalNetPayable: 0,
          totalAdvance: 0,
          totalBalancePending: 0,
          earliestDueDate: null,
          overdueCount: 0,
          records: [],
        });
      }
      const vs = map.get(vid)!;
      vs.thcCount += 1;
      vs.totalGross += r.thc_gross_amount ?? 0;
      vs.totalTDS += r.thc_tds_amount ?? 0;
      vs.totalNetPayable += r.thc_net_payable_amount ?? 0;
      vs.totalAdvance += r.thc_advance_amount ?? 0;
      vs.totalBalancePending += r.thc_balance_amount ?? 0;
      if (r.bth_due_date) {
        if (!vs.earliestDueDate || r.bth_due_date < vs.earliestDueDate) {
          vs.earliestDueDate = r.bth_due_date;
        }
      }
      if (r.bth_due_date && r.bth_due_date < today) vs.overdueCount += 1;
      vs.records.push(r);
    }
    return Array.from(map.values()).sort((a, b) => b.totalBalancePending - a.totalBalancePending);
  }, [records]);

  const filteredVendors = useMemo(() => {
    let list = vendorSummaries;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((v) => v.vendorName.toLowerCase().includes(q));
    }
    if (overdueOnly) {
      list = list.filter((v) => v.overdueCount > 0);
    }
    return list;
  }, [vendorSummaries, searchTerm, overdueOnly]);

  const grandTotals = useMemo(() => {
    return filteredVendors.reduce(
      (acc, v) => ({
        gross: acc.gross + v.totalGross,
        tds: acc.tds + v.totalTDS,
        netPayable: acc.netPayable + v.totalNetPayable,
        advance: acc.advance + v.totalAdvance,
        balance: acc.balance + v.totalBalancePending,
        thcs: acc.thcs + v.thcCount,
      }),
      { gross: 0, tds: 0, netPayable: 0, advance: 0, balance: 0, thcs: 0 }
    );
  }, [filteredVendors]);

  const overallStats = useMemo(() => {
    const totalVendors = vendorSummaries.length;
    const totalBalance = vendorSummaries.reduce((s, v) => s + v.totalBalancePending, 0);
    const overdueBalance = vendorSummaries.reduce((s, v) => {
      return s + v.records.filter((r) => r.bth_due_date && r.bth_due_date < today).reduce((a, r) => a + (r.thc_balance_amount ?? 0), 0);
    }, 0);
    const dueSoonBalance = vendorSummaries.reduce((s, v) => {
      return s + v.records.filter((r) => {
        if (!r.bth_due_date) return false;
        const diff = Math.ceil((new Date(r.bth_due_date).getTime() - new Date(today).getTime()) / 86400000);
        return diff >= 0 && diff <= 7;
      }).reduce((a, r) => a + (r.thc_balance_amount ?? 0), 0);
    }, 0);
    const totalTHCs = vendorSummaries.reduce((s, v) => s + v.thcCount, 0);
    const totalNetPayable = vendorSummaries.reduce((s, v) => s + v.totalNetPayable, 0);
    const totalAdvance = vendorSummaries.reduce((s, v) => s + v.totalAdvance, 0);
    return { totalVendors, totalBalance, overdueBalance, dueSoonBalance, totalTHCs, totalNetPayable, totalAdvance };
  }, [vendorSummaries]);

  const toggleVendor = (vendorId: string) => {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  };

  const handleExportSummary = () => {
    const summaryRows = filteredVendors.map((v, i) => ({
      'Sr.No': i + 1,
      'Vendor Name': v.vendorName,
      'THC Count': v.thcCount,
      'Total Gross Amount': v.totalGross,
      'Total TDS': v.totalTDS,
      'Total Net Payable': v.totalNetPayable,
      'Total Advance Paid': v.totalAdvance,
      'Balance Pending': v.totalBalancePending,
      'Earliest Due Date': v.earliestDueDate || '',
      'Overdue THCs': v.overdueCount,
    }));

    summaryRows.push({
      'Sr.No': 0,
      'Vendor Name': 'GRAND TOTAL',
      'THC Count': grandTotals.thcs,
      'Total Gross Amount': grandTotals.gross,
      'Total TDS': grandTotals.tds,
      'Total Net Payable': grandTotals.netPayable,
      'Total Advance Paid': grandTotals.advance,
      'Balance Pending': grandTotals.balance,
      'Earliest Due Date': '',
      'Overdue THCs': 0,
    });

    const detailRows: object[] = [];
    for (const v of filteredVendors) {
      for (const r of v.records) {
        detailRows.push({
          'Vendor Name': v.vendorName,
          'THC Number': r.thc_id_number || '',
          'THC Date': r.thc_date || '',
          'LR Number': r.lr_number || '',
          'Vehicle Number': r.vehicle_number || '',
          'Origin': r.origin || '',
          'Destination': r.destination || '',
          'Gross Amount': r.thc_gross_amount ?? 0,
          'TDS Amount': r.thc_tds_amount ?? 0,
          'Net Payable': r.thc_net_payable_amount ?? 0,
          'Advance Paid': r.thc_advance_amount ?? 0,
          'Balance Pending': r.thc_balance_amount ?? 0,
          'BTH Due Date': r.bth_due_date || '',
          'Status': !r.bth_due_date ? 'No Due Date' : r.bth_due_date < today ? 'OVERDUE' : 'Pending',
        });
      }
    }

    const wbSummary = XLSX.utils.json_to_sheet(summaryRows);
    const wbDetail = XLSX.utils.json_to_sheet(detailRows);

    wbSummary['!cols'] = [
      { wch: 6 }, { wch: 32 }, { wch: 10 }, { wch: 18 }, { wch: 12 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
    ];
    wbDetail['!cols'] = [
      { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wbSummary, 'Vendor Summary');
    XLSX.utils.book_append_sheet(wb, wbDetail, 'THC Details');
    XLSX.writeFile(wb, `AP_Vendor_Payable_${today}.xlsx`);
  };

  const statusBadge = (status: ReturnType<typeof getDueDateStatus>) => {
    if (status === 'overdue')
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3" />Overdue</span>;
    if (status === 'due-soon')
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock className="w-3 h-3" />Due Soon</span>;
    if (status === 'ok')
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Pending</span>;
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">No Due Date</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <BarChart3 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AP Report</h1>
            <p className="text-sm text-gray-500">Vendor Wise Payable Listing — Pending BTH Liability</p>
          </div>
        </div>
        <button
          onClick={fetchPendingPayables}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vendors</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalVendors}</p>
              <p className="text-xs text-gray-400 mt-0.5">{overallStats.totalTHCs} pending THCs</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net Payable</span>
              </div>
              <p className="text-xl font-bold text-gray-900">₹{fmt(overallStats.totalNetPayable)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Gross total</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full bg-gray-300" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Advance Paid</span>
              </div>
              <p className="text-xl font-bold text-gray-900">₹{fmt(overallStats.totalAdvance)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Already disbursed</p>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">BTH Liability</span>
              </div>
              <p className="text-xl font-bold text-blue-700">₹{fmt(overallStats.totalBalance)}</p>
              <p className="text-xs text-blue-500 mt-0.5">Total balance pending</p>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Due This Week</span>
              </div>
              <p className="text-xl font-bold text-amber-700">₹{fmt(overallStats.dueSoonBalance)}</p>
              <p className="text-xs text-amber-500 mt-0.5">Next 7 days</p>
            </div>

            <div className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Overdue</span>
              </div>
              <p className="text-xl font-bold text-red-700">₹{fmt(overallStats.overdueBalance)}</p>
              <p className="text-xs text-red-500 mt-0.5">Past due date</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setOverdueOnly((v) => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${overdueOnly ? 'bg-red-600' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${overdueOnly ? 'translate-x-4' : ''}`}
                    />
                  </div>
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    Overdue Only
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleExportSummary}
                  disabled={filteredVendors.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Download Excel
                </button>
              </div>
            </div>

            {filteredVendors.length === 0 ? (
              <div className="py-20 text-center">
                <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No pending payables found</p>
                <p className="text-gray-400 text-xs mt-1">All BTH balances have been paid or no records match the filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="w-10 px-4 py-3" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Sr.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Vendor Name</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">THCs</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Gross Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">TDS</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Net Payable</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Advance Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wide">Balance Pending</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((v, i) => {
                      const dueSt = getDueDateStatus(v.earliestDueDate);
                      const isExpanded = expandedVendors.has(v.vendorId);
                      return (
                        <>
                          <tr
                            key={v.vendorId}
                            className={`border-b border-gray-100 cursor-pointer transition-colors ${
                              dueSt === 'overdue'
                                ? 'bg-red-50 hover:bg-red-100'
                                : dueSt === 'due-soon'
                                ? 'bg-amber-50 hover:bg-amber-100'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => toggleVendor(v.vendorId)}
                          >
                            <td className="px-4 py-3 text-center">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-500 mx-auto" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400 mx-auto" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{v.vendorName}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                                {v.thcCount}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">₹{fmt(v.totalGross)}</td>
                            <td className="px-4 py-3 text-right text-gray-500">₹{fmt(v.totalTDS)}</td>
                            <td className="px-4 py-3 text-right text-gray-800 font-medium">₹{fmt(v.totalNetPayable)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">₹{fmt(v.totalAdvance)}</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-700">₹{fmt(v.totalBalancePending)}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.earliestDueDate || '—'}</td>
                            <td className="px-4 py-3">{statusBadge(dueSt)}</td>
                          </tr>

                          {isExpanded && (
                            <tr key={`${v.vendorId}-detail`} className="bg-gray-50 border-b border-gray-200">
                              <td colSpan={11} className="px-0 py-0">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-100 border-b border-slate-200">
                                        <th className="px-6 py-2 text-left font-semibold text-slate-600 pl-12">THC No.</th>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Date</th>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">LR Number</th>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Vehicle</th>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Origin</th>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Destination</th>
                                        <th className="px-4 py-2 text-right font-semibold text-slate-600">Gross</th>
                                        <th className="px-4 py-2 text-right font-semibold text-slate-600">TDS</th>
                                        <th className="px-4 py-2 text-right font-semibold text-slate-600">Net Payable</th>
                                        <th className="px-4 py-2 text-right font-semibold text-slate-600">Advance</th>
                                        <th className="px-4 py-2 text-right font-semibold text-blue-600">Balance</th>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Due Date</th>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {v.records.map((r) => {
                                        const rStatus = getDueDateStatus(r.bth_due_date);
                                        return (
                                          <tr
                                            key={r.thc_id}
                                            className={`border-b border-slate-100 ${
                                              rStatus === 'overdue'
                                                ? 'bg-red-50'
                                                : rStatus === 'due-soon'
                                                ? 'bg-amber-50'
                                                : 'bg-white'
                                            }`}
                                          >
                                            <td className="px-6 py-2 font-medium text-gray-800 pl-12">{r.thc_id_number || '—'}</td>
                                            <td className="px-4 py-2 text-gray-600">{r.thc_date || '—'}</td>
                                            <td className="px-4 py-2 text-gray-600">{r.lr_number || '—'}</td>
                                            <td className="px-4 py-2 text-gray-600">{r.vehicle_number || '—'}</td>
                                            <td className="px-4 py-2 text-gray-600">{r.origin || '—'}</td>
                                            <td className="px-4 py-2 text-gray-600">{r.destination || '—'}</td>
                                            <td className="px-4 py-2 text-right text-gray-700">₹{fmt(r.thc_gross_amount ?? 0)}</td>
                                            <td className="px-4 py-2 text-right text-gray-500">₹{fmt(r.thc_tds_amount ?? 0)}</td>
                                            <td className="px-4 py-2 text-right text-gray-800">₹{fmt(r.thc_net_payable_amount ?? 0)}</td>
                                            <td className="px-4 py-2 text-right text-gray-600">₹{fmt(r.thc_advance_amount ?? 0)}</td>
                                            <td className="px-4 py-2 text-right font-semibold text-blue-700">₹{fmt(r.thc_balance_amount ?? 0)}</td>
                                            <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{r.bth_due_date || '—'}</td>
                                            <td className="px-4 py-2">{statusBadge(rStatus)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-sm">
                      <td colSpan={4} className="px-4 py-3 text-right text-gray-700 uppercase tracking-wide text-xs">
                        Grand Total — {grandTotals.thcs} THCs
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">₹{fmt(grandTotals.gross)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{fmt(grandTotals.tds)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">₹{fmt(grandTotals.netPayable)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{fmt(grandTotals.advance)}</td>
                      <td className="px-4 py-3 text-right text-blue-800 text-base">₹{fmt(grandTotals.balance)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
