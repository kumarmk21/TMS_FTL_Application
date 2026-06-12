import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileDown, Loader2, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LRRow {
  tran_id: string;
  manual_lr_no: string | null;
  lr_date: string | null;
  bill_no: string | null;
  bill_date: string | null;
  billing_party_code: string | null;
  billing_party_name: string | null;
  from_city: string | null;
  to_city: string | null;
  vehicle_number: string | null;
  vehicle_type: string | null;
  consignor: string | null;
  consignee: string | null;
  no_of_pkgs: number | null;
  chrg_wt: number | null;
  freight_amount: number | null;
  loading_charges: number | null;
  unloading_charges: number | null;
  detention_charges: number | null;
  docket_charges: number | null;
  penalties_oth_charges: number | null;
  subtotal: number | null;
  gst_amount: number | null;
  lr_total_amount: number | null;
  pay_basis: string | null;
  lr_financial_status: string | null;
}

interface BillingParty {
  billing_party_code: string;
  billing_party_name: string;
}

interface PartyGroup {
  party_code: string;
  party_name: string;
  rows: LRRow[];
  total_freight: number;
  total_loading: number;
  total_unloading: number;
  total_detention: number;
  total_other: number;
  total_subtotal: number;
  total_gst: number;
  total_amount: number;
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB') : '-';

const inr = (v: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function PartyWiseSalesReport() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedParty, setSelectedParty] = useState('');
  const [billingParties, setBillingParties] = useState<BillingParty[]>([]);
  const [partyGroups, setPartyGroups] = useState<PartyGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetchBillingParties();
  }, []);

  const fetchBillingParties = async () => {
    setPartiesLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('billing_party_code, billing_party_name')
        .not('billing_party_code', 'is', null)
        .not('billing_party_name', 'is', null);

      if (error) throw error;

      const seen = new Set<string>();
      const unique: BillingParty[] = [];
      for (const row of data || []) {
        if (row.billing_party_code && !seen.has(row.billing_party_code)) {
          seen.add(row.billing_party_code);
          unique.push({
            billing_party_code: row.billing_party_code,
            billing_party_name: row.billing_party_name || row.billing_party_code,
          });
        }
      }
      unique.sort((a, b) => a.billing_party_name.localeCompare(b.billing_party_name));
      setBillingParties(unique);
    } catch (err) {
      console.error('Error fetching billing parties:', err);
    } finally {
      setPartiesLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!fromDate || !toDate) return;

    setLoading(true);
    setSearched(true);
    try {
      let query = supabase
        .from('booking_lr')
        .select(
          'tran_id, manual_lr_no, lr_date, bill_no, bill_date, billing_party_code, billing_party_name, from_city, to_city, vehicle_number, vehicle_type, consignor, consignee, no_of_pkgs, chrg_wt, freight_amount, loading_charges, unloading_charges, detention_charges, docket_charges, penalties_oth_charges, subtotal, gst_amount, lr_total_amount, pay_basis, lr_financial_status'
        )
        .gte('lr_date', fromDate)
        .lte('lr_date', toDate)
        .order('billing_party_name', { ascending: true })
        .order('lr_date', { ascending: true });

      if (selectedParty) {
        query = query.eq('billing_party_code', selectedParty);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows: LRRow[] = data || [];

      // Group by billing party
      const groupMap = new Map<string, PartyGroup>();
      for (const r of rows) {
        const key = r.billing_party_code || '__none__';
        const name = r.billing_party_name || 'Unknown';
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            party_code: key,
            party_name: name,
            rows: [],
            total_freight: 0,
            total_loading: 0,
            total_unloading: 0,
            total_detention: 0,
            total_other: 0,
            total_subtotal: 0,
            total_gst: 0,
            total_amount: 0,
          });
        }
        const g = groupMap.get(key)!;
        g.rows.push(r);
        g.total_freight += Number(r.freight_amount || 0);
        g.total_loading += Number(r.loading_charges || 0);
        g.total_unloading += Number(r.unloading_charges || 0);
        g.total_detention += Number(r.detention_charges || 0);
        g.total_other += Number(r.docket_charges || 0) + Number(r.penalties_oth_charges || 0);
        g.total_subtotal += Number(r.subtotal || 0);
        g.total_gst += Number(r.gst_amount || 0);
        g.total_amount += Number(r.lr_total_amount || 0);
      }

      setPartyGroups(Array.from(groupMap.values()));
    } catch (err) {
      console.error('Error fetching party wise sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const grandTotals = partyGroups.reduce(
    (acc, g) => ({
      freight: acc.freight + g.total_freight,
      loading: acc.loading + g.total_loading,
      unloading: acc.unloading + g.total_unloading,
      detention: acc.detention + g.total_detention,
      other: acc.other + g.total_other,
      subtotal: acc.subtotal + g.total_subtotal,
      gst: acc.gst + g.total_gst,
      amount: acc.amount + g.total_amount,
      lrs: acc.lrs + g.rows.length,
    }),
    { freight: 0, loading: 0, unloading: 0, detention: 0, other: 0, subtotal: 0, gst: 0, amount: 0, lrs: 0 }
  );

  const handleExport = () => {
    if (!partyGroups.length) return;

    const exportRows: Record<string, string | number>[] = [];
    let srNo = 1;

    for (const g of partyGroups) {
      for (const r of g.rows) {
        exportRows.push({
          'Sr.No': srNo++,
          'Billing Party': g.party_name,
          'LR Number': r.manual_lr_no || '',
          'LR Date': r.lr_date || '',
          'Bill No': r.bill_no || '',
          'Bill Date': r.bill_date || '',
          'From City': r.from_city || '',
          'To City': r.to_city || '',
          'Consignor': r.consignor || '',
          'Consignee': r.consignee || '',
          'Vehicle No': r.vehicle_number || '',
          'Vehicle Type': r.vehicle_type || '',
          'Pkgs': r.no_of_pkgs ?? '',
          'Chrg Wt (KG)': r.chrg_wt ?? '',
          'Freight Amt': r.freight_amount ?? 0,
          'Loading': r.loading_charges ?? 0,
          'Unloading': r.unloading_charges ?? 0,
          'Detention': r.detention_charges ?? 0,
          'Other Charges': (Number(r.docket_charges || 0) + Number(r.penalties_oth_charges || 0)),
          'Subtotal': r.subtotal ?? 0,
          'GST Amt': r.gst_amount ?? 0,
          'Total Amount': r.lr_total_amount ?? 0,
          'Pay Basis': r.pay_basis || '',
          'Financial Status': r.lr_financial_status || '',
        });
      }
      // Party subtotal row
      exportRows.push({
        'Sr.No': '',
        'Billing Party': `SUBTOTAL — ${g.party_name} (${g.rows.length} LRs)`,
        'LR Number': '', 'LR Date': '', 'Bill No': '', 'Bill Date': '',
        'From City': '', 'To City': '', 'Consignor': '', 'Consignee': '',
        'Vehicle No': '', 'Vehicle Type': '', 'Pkgs': '', 'Chrg Wt (KG)': '',
        'Freight Amt': g.total_freight,
        'Loading': g.total_loading,
        'Unloading': g.total_unloading,
        'Detention': g.total_detention,
        'Other Charges': g.total_other,
        'Subtotal': g.total_subtotal,
        'GST Amt': g.total_gst,
        'Total Amount': g.total_amount,
        'Pay Basis': '', 'Financial Status': '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Party Wise Sales');
    XLSX.writeFile(wb, `Party_Wise_Sales_${fromDate}_to_${toDate}.xlsx`);
  };

  const cols = [
    'Sr.', 'LR Number', 'LR Date', 'Bill No', 'Bill Date',
    'From City', 'To City', 'Consignor', 'Consignee',
    'Vehicle No', 'Pkgs', 'Chrg Wt',
    'Freight Amt', 'Lod+Unlod', 'Detention', 'Other',
    'Subtotal', 'GST Amt', 'Total Amt',
    'Pay Basis', 'Fin. Status',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <BarChart3 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Party Wise Sales</h1>
          <p className="text-sm text-gray-500">Sales summary grouped by billing party</p>
        </div>
      </div>

      {/* Criteria */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">Search Criteria</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              From Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              To Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Billing Party</label>
            {partiesLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading...</span>
              </div>
            ) : (
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="">All Parties</option>
                {billingParties.map((p) => (
                  <option key={p.billing_party_code} value={p.billing_party_code}>
                    {p.billing_party_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <button
              onClick={handleSearch}
              disabled={loading || !fromDate || !toDate}
              className="w-full flex items-center justify-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Results header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="font-semibold text-gray-700">
                {grandTotals.lrs} LR{grandTotals.lrs !== 1 ? 's' : ''} across {partyGroups.length} part{partyGroups.length !== 1 ? 'ies' : 'y'}
              </span>
              {partyGroups.length > 0 && (
                <span className="text-gray-500">
                  Total: <strong className="text-gray-900">₹{inr(grandTotals.amount)}</strong>
                </span>
              )}
            </div>
            {partyGroups.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                Export Excel
              </button>
            )}
          </div>

          {partyGroups.length === 0 ? (
            <div className="py-16 text-center">
              <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No records found for the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Sr.</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">LR No.</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">LR Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Bill No.</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Bill Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">From</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">To</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Consignor</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Consignee</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Vehicle No.</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Pkgs</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Chrg Wt</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Freight</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">L+U</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Detention</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Other</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Subtotal</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">GST</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Total</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Pay Basis</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Fin. Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partyGroups.map((g) => {
                    let partySeq = 0;
                    return (
                      <>
                        {/* Party header row */}
                        <tr key={`hdr-${g.party_code}`} className="bg-slate-800">
                          <td colSpan={21} className="px-4 py-2.5">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              {g.party_name}
                            </span>
                            <span className="ml-3 text-xs text-slate-300">{g.rows.length} LR{g.rows.length !== 1 ? 's' : ''}</span>
                          </td>
                        </tr>

                        {/* LR rows */}
                        {g.rows.map((r) => {
                          partySeq++;
                          const luAmt = Number(r.loading_charges || 0) + Number(r.unloading_charges || 0);
                          const otherAmt = Number(r.docket_charges || 0) + Number(r.penalties_oth_charges || 0);
                          return (
                            <tr key={r.tran_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2.5 text-gray-400 text-xs">{partySeq}</td>
                              <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{r.manual_lr_no || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmt(r.lr_date)}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.bill_no || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmt(r.bill_date)}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.from_city || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.to_city || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-700 max-w-[120px] truncate" title={r.consignor || ''}>{r.consignor || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-700 max-w-[120px] truncate" title={r.consignee || ''}>{r.consignee || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.vehicle_number || '-'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-600">{r.no_of_pkgs ?? '-'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-600">{r.chrg_wt ?? '-'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-800 whitespace-nowrap">₹{inr(Number(r.freight_amount || 0))}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">{luAmt > 0 ? `₹${inr(luAmt)}` : '-'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">{Number(r.detention_charges || 0) > 0 ? `₹${inr(Number(r.detention_charges))}` : '-'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">{otherAmt > 0 ? `₹${inr(otherAmt)}` : '-'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-800 whitespace-nowrap">₹{inr(Number(r.subtotal || 0))}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">{Number(r.gst_amount || 0) > 0 ? `₹${inr(Number(r.gst_amount))}` : '-'}</td>
                              <td className="px-3 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">₹{inr(Number(r.lr_total_amount || 0))}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.pay_basis || '-'}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {r.lr_financial_status ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                    {r.lr_financial_status}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Party subtotal row */}
                        <tr key={`sub-${g.party_code}`} className="bg-red-50 border-y-2 border-red-100">
                          <td colSpan={12} className="px-4 py-2.5 text-right text-xs font-bold text-red-800 uppercase tracking-wide">
                            Subtotal — {g.party_name}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_freight)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_loading + g.total_unloading)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_detention)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_other)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_subtotal)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_gst)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_amount)}</td>
                          <td colSpan={2} />
                        </tr>
                      </>
                    );
                  })}
                </tbody>

                {/* Grand total */}
                <tfoot>
                  <tr className="bg-slate-900 border-t-2 border-slate-700">
                    <td colSpan={12} className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wide">
                      Grand Total — {grandTotals.lrs} LRs / {partyGroups.length} Parties
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.freight)}</td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.loading + grandTotals.unloading)}</td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.detention)}</td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.other)}</td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.subtotal)}</td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.gst)}</td>
                    <td className="px-3 py-3 text-right font-bold text-yellow-300 whitespace-nowrap text-base">₹{inr(grandTotals.amount)}</td>
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
