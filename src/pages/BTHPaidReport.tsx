import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileDown, Loader2, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface THCRecord {
  thc_id: string;
  thc_id_number: string;
  thc_date: string | null;
  lr_number: string | null;
  vehicle_number: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  thc_amount: number | null;
  thc_gross_amount: number | null;
  thc_advance_amount: number | null;
  thc_balance_amount: number | null;
  thc_net_payable_amount: number | null;
  thc_tds_amount: number | null;
  thc_balance_payment_date: string | null;
  thc_balance_pmt_utr_details: string | null;
  ven_act_name: string | null;
  thc_vendor: string | null;
  vendor_name?: string;
}

interface Vendor {
  thc_vendor: string;
  ven_act_name: string;
}

export default function BTHPaidReport() {
  const [searchType, setSearchType] = useState<'date' | 'vendor'>('date');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [records, setRecords] = useState<THCRecord[]>([]);
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
        .not('thc_balance_payment_date', 'is', null);

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

  const handleSearch = async () => {
    if (searchType === 'date' && !selectedDate) return;
    if (searchType === 'vendor' && !selectedVendor) return;

    setLoading(true);
    setSearched(true);
    try {
      let query = supabase
        .from('thc_details')
        .select('thc_id, thc_id_number, thc_date, lr_number, vehicle_number, origin, destination, vehicle_type, thc_amount, thc_gross_amount, thc_advance_amount, thc_balance_amount, thc_net_payable_amount, thc_tds_amount, thc_balance_payment_date, thc_balance_pmt_utr_details, ven_act_name, thc_vendor')
        .not('thc_balance_payment_date', 'is', null)
        .order('thc_balance_payment_date', { ascending: false });

      if (searchType === 'date') {
        query = query.eq('thc_balance_payment_date', selectedDate);
      } else {
        query = query.eq('thc_vendor', selectedVendor);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!records.length) return;
    const exportData = records.map((r, i) => ({
      'Sr.No': i + 1,
      'THC Number': r.thc_id_number || '',
      'THC Date': r.thc_date || '',
      'LR Number': r.lr_number || '',
      'Vendor': r.ven_act_name || '',
      'Vehicle Number': r.vehicle_number || '',
      'Origin': r.origin || '',
      'Destination': r.destination || '',
      'Vehicle Type': r.vehicle_type || '',
      'Gross Amount': r.thc_gross_amount ?? '',
      'THC Amount': r.thc_amount ?? '',
      'TDS Amount': r.thc_tds_amount ?? '',
      'Net Payable': r.thc_net_payable_amount ?? '',
      'Advance Amount': r.thc_advance_amount ?? '',
      'Balance Amount': r.thc_balance_amount ?? '',
      'Balance Payment Date': r.thc_balance_payment_date || '',
      'UTR Details': r.thc_balance_pmt_utr_details || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BTH Paid Report');
    XLSX.writeFile(wb, `BTH_Paid_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalBalance = records.reduce((sum, r) => sum + (r.thc_balance_amount || 0), 0);
  const totalNet = records.reduce((sum, r) => sum + (r.thc_net_payable_amount || 0), 0);
  const totalAdvance = records.reduce((sum, r) => sum + (r.thc_advance_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <BarChart3 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BTH Paid Report</h1>
          <p className="text-sm text-gray-500">View balance payment records for THC entries</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Search Criteria</h2>

        <div className="flex items-center gap-8 mb-6">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="searchType"
              value="date"
              checked={searchType === 'date'}
              onChange={() => { setSearchType('date'); setRecords([]); setSearched(false); }}
              className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-gray-700">Date Wise</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="searchType"
              value="vendor"
              checked={searchType === 'vendor'}
              onChange={() => { setSearchType('vendor'); setRecords([]); setSearched(false); }}
              className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-gray-700">Vendor Wise</span>
          </label>
        </div>

        <div className="flex items-end gap-4">
          {searchType === 'date' && (
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Balance Payment Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          )}

          {searchType === 'vendor' && (
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Select Vendor
              </label>
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
            disabled={loading || (searchType === 'date' ? !selectedDate : !selectedVendor)}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </div>

      {searched && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">
                {records.length} record{records.length !== 1 ? 's' : ''} found
              </span>
              {records.length > 0 && (
                <div className="flex items-center gap-4 ml-4 text-xs text-gray-500">
                  <span>Net Payable: <strong className="text-gray-800">₹{totalNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  <span>Advance: <strong className="text-gray-800">₹{totalAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  <span>Balance Paid: <strong className="text-green-700">₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
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
              <p className="text-gray-500 text-sm">No BTH paid records found for the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Sr.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">THC No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">THC Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">LR Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Vehicle No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Origin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Destination</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Net Payable</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Advance</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Balance Paid</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Pmt Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">UTR Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r, i) => (
                    <tr key={r.thc_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.thc_id_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.thc_date || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.lr_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{r.ven_act_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.vehicle_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.origin || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.destination || '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-800">
                        {r.thc_net_payable_amount != null ? `₹${r.thc_net_payable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {r.thc_advance_amount != null ? `₹${r.thc_advance_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        {r.thc_balance_amount != null ? `₹${r.thc_balance_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.thc_balance_payment_date || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate" title={r.thc_balance_pmt_utr_details || ''}>
                        {r.thc_balance_pmt_utr_details || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td colSpan={8} className="px-4 py-3 text-right text-gray-700 text-xs uppercase tracking-wide">Totals</td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      ₹{totalNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      ₹{totalAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} />
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
