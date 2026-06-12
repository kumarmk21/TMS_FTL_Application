import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileDown, Loader2, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ATHRecord {
  thc_id: string;
  thc_id_number: string | null;
  thc_number: string | null;
  lr_number: string | null;
  vehicle_number: string | null;
  ven_act_name: string | null;
  thc_vendor: string | null;
  thc_amount: number | null;
  thc_advance_amount: number | null;
  thc_balance_amount: number | null;
  origin: string | null;
  destination: string | null;
  ath_date: string | null;
  ath_voucher_no: string | null;
}

interface Vendor {
  thc_vendor: string;
  ven_act_name: string;
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const inr = (v: number | null) =>
  v != null ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';

export default function ATHPaidReport() {
  const [searchType, setSearchType] = useState<'date' | 'lr' | 'vendor'>('date');
  const [selectedDate, setSelectedDate] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [records, setRecords] = useState<ATHRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setVendorsLoading(true);
    try {
      const { data, error } = await supabase
        .from('thc_details')
        .select('thc_vendor, ven_act_name')
        .not('thc_vendor', 'is', null)
        .not('ven_act_name', 'is', null)
        .not('ath_date', 'is', null);

      if (error) throw error;

      const seen = new Set<string>();
      const unique: Vendor[] = [];
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

  const isSubmitDisabled = () => {
    if (searchType === 'date') return !selectedDate;
    if (searchType === 'lr') return !lrNumber.trim();
    return !selectedVendor;
  };

  const handleSearch = async () => {
    if (isSubmitDisabled()) return;

    setLoading(true);
    setSearched(true);
    try {
      let query = supabase
        .from('thc_details')
        .select(
          'thc_id, thc_id_number, thc_number, lr_number, vehicle_number, ven_act_name, thc_vendor, thc_amount, thc_advance_amount, thc_balance_amount, origin, destination, ath_date, ath_voucher_no'
        )
        .not('ath_date', 'is', null)
        .order('ath_date', { ascending: false });

      if (searchType === 'date') {
        query = query.eq('ath_date', selectedDate);
      } else if (searchType === 'lr') {
        query = query.ilike('lr_number', `%${lrNumber.trim()}%`);
      } else {
        query = query.eq('thc_vendor', selectedVendor);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching ATH records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!records.length) return;
    const exportData = records.map((r, i) => ({
      'Sr.No': i + 1,
      'THC Number': r.thc_id_number || r.thc_number || '',
      'LR Number': r.lr_number || '',
      'Vendor': r.ven_act_name || '',
      'Vehicle Number': r.vehicle_number || '',
      'THC Amount': r.thc_amount ?? '',
      'Advance Amount': r.thc_advance_amount ?? '',
      'Balance Amount': r.thc_balance_amount ?? '',
      'Origin': r.origin || '',
      'Destination': r.destination || '',
      'ATH Date': r.ath_date || '',
      'ATH Voucher No': r.ath_voucher_no || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ATH Paid Report');
    XLSX.writeFile(wb, `ATH_Paid_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalTHC = records.reduce((s, r) => s + (r.thc_amount || 0), 0);
  const totalAdvance = records.reduce((s, r) => s + (r.thc_advance_amount || 0), 0);
  const totalBalance = records.reduce((s, r) => s + (r.thc_balance_amount || 0), 0);

  const resetSearch = (type: 'date' | 'lr' | 'vendor') => {
    setSearchType(type);
    setRecords([]);
    setSearched(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <BarChart3 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ATH Paid Report</h1>
          <p className="text-sm text-gray-500">View advance truck hire payment records</p>
        </div>
      </div>

      {/* Search criteria */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Search Criteria</h2>

        <div className="flex items-center gap-8 mb-6">
          {(['date', 'lr', 'vendor'] as const).map((t) => (
            <label key={t} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="searchType"
                value={t}
                checked={searchType === t}
                onChange={() => resetSearch(t)}
                className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {t === 'date' ? 'Date Wise' : t === 'lr' ? 'LR Number' : 'Vendor Wise'}
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-end gap-4">
          {searchType === 'date' && (
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">ATH Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          )}

          {searchType === 'lr' && (
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">LR Number</label>
              <input
                type="text"
                value={lrNumber}
                onChange={(e) => setLrNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSubmitDisabled() && handleSearch()}
                placeholder="Enter LR number..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          )}

          {searchType === 'vendor' && (
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Vendor</label>
              {vendorsLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400">Loading vendors...</span>
                </div>
              ) : (
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map((v) => (
                    <option key={v.thc_vendor} value={v.thc_vendor}>
                      {v.ven_act_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={loading || isSubmitDisabled()}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Submit
          </button>
        </div>
      </div>

      {/* Results */}
      {searched && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">
                {records.length} record{records.length !== 1 ? 's' : ''} found
              </span>
              {records.length > 0 && (
                <div className="flex items-center gap-4 ml-2 text-xs text-gray-500">
                  <span>THC Amt: <strong className="text-gray-800">{inr(totalTHC)}</strong></span>
                  <span>Advance: <strong className="text-blue-700">{inr(totalAdvance)}</strong></span>
                  <span>Balance: <strong className="text-amber-700">{inr(totalBalance)}</strong></span>
                </div>
              )}
            </div>
            {records.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                Export Excel
              </button>
            )}
          </div>

          {records.length === 0 ? (
            <div className="py-16 text-center">
              <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No ATH paid records found for the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Sr.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">THC No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">LR Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Vehicle No.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">THC Amt</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Advance Amt</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Balance Amt</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Origin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Destination</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">ATH Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">ATH Voucher No.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r, i) => (
                    <tr key={r.thc_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.thc_id_number || r.thc_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.lr_number || '-'}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{r.ven_act_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.vehicle_number || '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-800">{inr(r.thc_amount)}</td>
                      <td className="px-4 py-3 text-right text-blue-700 font-semibold">{inr(r.thc_advance_amount)}</td>
                      <td className="px-4 py-3 text-right text-amber-700 font-semibold">{inr(r.thc_balance_amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{r.origin || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.destination || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.ath_date ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800">
                            {fmt(r.ath_date)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.ath_voucher_no || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td colSpan={5} className="px-4 py-3 text-right text-gray-700 text-xs uppercase tracking-wide">Totals</td>
                    <td className="px-4 py-3 text-right text-gray-900">{inr(totalTHC)}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{inr(totalAdvance)}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{inr(totalBalance)}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
