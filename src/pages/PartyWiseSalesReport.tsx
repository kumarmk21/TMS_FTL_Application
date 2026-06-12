import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileDown, Loader2, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';

// Unified row shape for both transport LRs and warehouse bills
interface SalesRow {
  id: string;
  source: 'Transport' | 'Warehouse';
  ref_number: string | null;       // LR no or WB number
  ref_date: string | null;         // lr_date or bill_date
  bill_no: string | null;          // bill_no (transport) or bill_number (WB)
  bill_date: string | null;
  billing_party_code: string | null;
  billing_party_name: string | null;
  from_city: string | null;        // from_city or service_type
  to_city: string | null;          // to_city or '-'
  consignor: string | null;
  consignee: string | null;
  vehicle_number: string | null;
  no_of_pkgs: number | null;
  chrg_wt: number | null;
  freight_amount: number;          // warehouse_charges for WB
  loading_unloading: number;
  detention: number;
  other_charges: number;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  pay_basis: string | null;
  fin_status: string | null;       // lr_financial_status or bill_status
}

interface BillingParty {
  billing_party_code: string;
  billing_party_name: string;
}

interface PartyGroup {
  party_code: string;
  party_name: string;
  rows: SalesRow[];
  total_freight: number;
  total_lu: number;
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
      const [{ data: lrParties }, { data: wbParties }] = await Promise.all([
        supabase
          .from('booking_lr')
          .select('billing_party_code, billing_party_name')
          .not('billing_party_code', 'is', null)
          .not('billing_party_name', 'is', null),
        supabase
          .from('warehouse_bill')
          .select('billing_party_code, billing_party_name')
          .not('billing_party_code', 'is', null)
          .not('billing_party_name', 'is', null),
      ]);

      const seen = new Set<string>();
      const unique: BillingParty[] = [];
      for (const row of [...(lrParties || []), ...(wbParties || [])]) {
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
      // Build both queries in parallel
      let lrQuery = supabase
        .from('booking_lr')
        .select(
          'tran_id, manual_lr_no, lr_date, bill_no, bill_date, billing_party_code, billing_party_name, from_city, to_city, vehicle_number, consignor, consignee, no_of_pkgs, chrg_wt, freight_amount, loading_charges, unloading_charges, detention_charges, docket_charges, penalties_oth_charges, subtotal, gst_amount, lr_total_amount, pay_basis, lr_financial_status'
        )
        .gte('lr_date', fromDate)
        .lte('lr_date', toDate);

      let wbQuery = supabase
        .from('warehouse_bill')
        .select(
          'bill_id, bill_number, bill_date, billing_party_code, billing_party_name, service_type, warehouse_charges, other_charges, sub_total, igst_amount, cgst_amount, sgst_amount, total_amount, gst_charge_type, bill_status'
        )
        .gte('bill_date', fromDate)
        .lte('bill_date', toDate)
        .neq('bill_status', 'Cancelled');

      if (selectedParty) {
        lrQuery = lrQuery.eq('billing_party_code', selectedParty);
        wbQuery = wbQuery.eq('billing_party_code', selectedParty);
      }

      const [{ data: lrData, error: lrErr }, { data: wbData, error: wbErr }] = await Promise.all([
        lrQuery.order('billing_party_name').order('lr_date'),
        wbQuery.order('billing_party_name').order('bill_date'),
      ]);

      if (lrErr) throw lrErr;
      if (wbErr) throw wbErr;

      // Normalise transport LR rows
      const transportRows: SalesRow[] = (lrData || []).map((r) => ({
        id: r.tran_id,
        source: 'Transport',
        ref_number: r.manual_lr_no || null,
        ref_date: r.lr_date,
        bill_no: r.bill_no || null,
        bill_date: r.bill_date || null,
        billing_party_code: r.billing_party_code,
        billing_party_name: r.billing_party_name,
        from_city: r.from_city,
        to_city: r.to_city,
        consignor: r.consignor,
        consignee: r.consignee,
        vehicle_number: r.vehicle_number,
        no_of_pkgs: r.no_of_pkgs,
        chrg_wt: r.chrg_wt,
        freight_amount: Number(r.freight_amount || 0),
        loading_unloading: Number(r.loading_charges || 0) + Number(r.unloading_charges || 0),
        detention: Number(r.detention_charges || 0),
        other_charges: Number(r.docket_charges || 0) + Number(r.penalties_oth_charges || 0),
        subtotal: Number(r.subtotal || 0),
        gst_amount: Number(r.gst_amount || 0),
        total_amount: Number(r.lr_total_amount || 0),
        pay_basis: r.pay_basis,
        fin_status: r.lr_financial_status,
      }));

      // Normalise warehouse bill rows
      const warehouseRows: SalesRow[] = (wbData || []).map((r) => {
        const gst = Number(r.igst_amount || 0) + Number(r.cgst_amount || 0) + Number(r.sgst_amount || 0);
        return {
          id: r.bill_id,
          source: 'Warehouse',
          ref_number: r.bill_number || null,
          ref_date: r.bill_date,
          bill_no: r.bill_number || null,
          bill_date: r.bill_date,
          billing_party_code: r.billing_party_code,
          billing_party_name: r.billing_party_name,
          from_city: r.service_type || 'Warehouse',
          to_city: null,
          consignor: null,
          consignee: null,
          vehicle_number: null,
          no_of_pkgs: null,
          chrg_wt: null,
          freight_amount: Number(r.warehouse_charges || 0),
          loading_unloading: 0,
          detention: 0,
          other_charges: Number(r.other_charges || 0),
          subtotal: Number(r.sub_total || 0),
          gst_amount: gst,
          total_amount: Number(r.total_amount || 0),
          pay_basis: null,
          fin_status: r.bill_status,
        };
      });

      const allRows = [...transportRows, ...warehouseRows];

      // Group by billing party (preserve alphabetical order)
      const groupMap = new Map<string, PartyGroup>();
      // Sort all rows by party name then date
      allRows.sort((a, b) => {
        const pCmp = (a.billing_party_name || '').localeCompare(b.billing_party_name || '');
        if (pCmp !== 0) return pCmp;
        return (a.ref_date || '').localeCompare(b.ref_date || '');
      });

      for (const r of allRows) {
        const key = r.billing_party_code || '__none__';
        const name = r.billing_party_name || 'Unknown';
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            party_code: key,
            party_name: name,
            rows: [],
            total_freight: 0,
            total_lu: 0,
            total_detention: 0,
            total_other: 0,
            total_subtotal: 0,
            total_gst: 0,
            total_amount: 0,
          });
        }
        const g = groupMap.get(key)!;
        g.rows.push(r);
        g.total_freight += r.freight_amount;
        g.total_lu += r.loading_unloading;
        g.total_detention += r.detention;
        g.total_other += r.other_charges;
        g.total_subtotal += r.subtotal;
        g.total_gst += r.gst_amount;
        g.total_amount += r.total_amount;
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
      lu: acc.lu + g.total_lu,
      detention: acc.detention + g.total_detention,
      other: acc.other + g.total_other,
      subtotal: acc.subtotal + g.total_subtotal,
      gst: acc.gst + g.total_gst,
      amount: acc.amount + g.total_amount,
      lrs: acc.lrs + g.rows.length,
    }),
    { freight: 0, lu: 0, detention: 0, other: 0, subtotal: 0, gst: 0, amount: 0, lrs: 0 }
  );

  const handleExport = () => {
    if (!partyGroups.length) return;

    const exportRows: Record<string, string | number>[] = [];
    let srNo = 1;

    for (const g of partyGroups) {
      for (const r of g.rows) {
        exportRows.push({
          'Sr.No': srNo++,
          'Source': r.source,
          'Billing Party': g.party_name,
          'Ref. Number': r.ref_number || '',
          'Ref. Date': r.ref_date || '',
          'Bill No': r.bill_no || '',
          'Bill Date': r.bill_date || '',
          'From / Service Type': r.from_city || '',
          'To City': r.to_city || '',
          'Consignor': r.consignor || '',
          'Consignee': r.consignee || '',
          'Vehicle No': r.vehicle_number || '',
          'Pkgs': r.no_of_pkgs ?? '',
          'Chrg Wt (KG)': r.chrg_wt ?? '',
          'Freight / WH Charges': r.freight_amount,
          'Loading + Unloading': r.loading_unloading,
          'Detention': r.detention,
          'Other Charges': r.other_charges,
          'Subtotal': r.subtotal,
          'GST Amount': r.gst_amount,
          'Total Amount': r.total_amount,
          'Pay Basis': r.pay_basis || '',
          'Status': r.fin_status || '',
        });
      }
      exportRows.push({
        'Sr.No': '',
        'Source': '',
        'Billing Party': `SUBTOTAL — ${g.party_name} (${g.rows.length} records)`,
        'Ref. Number': '', 'Ref. Date': '', 'Bill No': '', 'Bill Date': '',
        'From / Service Type': '', 'To City': '', 'Consignor': '', 'Consignee': '',
        'Vehicle No': '', 'Pkgs': '', 'Chrg Wt (KG)': '',
        'Freight / WH Charges': g.total_freight,
        'Loading + Unloading': g.total_lu,
        'Detention': g.total_detention,
        'Other Charges': g.total_other,
        'Subtotal': g.total_subtotal,
        'GST Amount': g.total_gst,
        'Total Amount': g.total_amount,
        'Pay Basis': '', 'Status': '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Party Wise Sales');
    XLSX.writeFile(wb, `Party_Wise_Sales_${fromDate}_to_${toDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <BarChart3 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Party Wise Sales</h1>
          <p className="text-sm text-gray-500">Transport & warehouse sales grouped by billing party</p>
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
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="font-semibold text-gray-700">
                {grandTotals.lrs} record{grandTotals.lrs !== 1 ? 's' : ''} across {partyGroups.length} part{partyGroups.length !== 1 ? 'ies' : 'y'}
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
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Source</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Ref. No.</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Ref. Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Bill No.</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Bill Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">From / Service</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">To</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Consignor</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Consignee</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Vehicle No.</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Pkgs</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Freight/WH</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">L+U</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Other</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Subtotal</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">GST</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Total</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partyGroups.map((g) => {
                    let seq = 0;
                    return (
                      <>
                        {/* Party header */}
                        <tr key={`hdr-${g.party_code}`} className="bg-slate-800">
                          <td colSpan={19} className="px-4 py-2.5">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">{g.party_name}</span>
                            <span className="ml-3 text-xs text-slate-300">{g.rows.length} record{g.rows.length !== 1 ? 's' : ''}</span>
                          </td>
                        </tr>

                        {/* Data rows */}
                        {g.rows.map((r) => {
                          seq++;
                          const isWH = r.source === 'Warehouse';
                          return (
                            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2.5 text-gray-400 text-xs">{seq}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${isWH ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {r.source}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{r.ref_number || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmt(r.ref_date)}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.bill_no || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmt(r.bill_date)}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.from_city || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.to_city || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-700 max-w-[110px] truncate" title={r.consignor || ''}>{r.consignor || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-700 max-w-[110px] truncate" title={r.consignee || ''}>{r.consignee || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.vehicle_number || '-'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-600">{r.no_of_pkgs ?? '-'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-800 whitespace-nowrap">₹{inr(r.freight_amount)}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">{r.loading_unloading > 0 ? `₹${inr(r.loading_unloading)}` : '-'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">{r.other_charges > 0 ? `₹${inr(r.other_charges)}` : '-'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-800 whitespace-nowrap">₹{inr(r.subtotal)}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">{r.gst_amount > 0 ? `₹${inr(r.gst_amount)}` : '-'}</td>
                              <td className="px-3 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">₹{inr(r.total_amount)}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {r.fin_status ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                    {r.fin_status}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Party subtotal */}
                        <tr key={`sub-${g.party_code}`} className="bg-red-50 border-y-2 border-red-100">
                          <td colSpan={12} className="px-4 py-2.5 text-right text-xs font-bold text-red-800 uppercase tracking-wide">
                            Subtotal — {g.party_name}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_freight)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_lu)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_other)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_subtotal)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_gst)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-900 whitespace-nowrap">₹{inr(g.total_amount)}</td>
                          <td />
                        </tr>
                      </>
                    );
                  })}
                </tbody>

                {/* Grand total */}
                <tfoot>
                  <tr className="bg-slate-900 border-t-2 border-slate-700">
                    <td colSpan={12} className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wide">
                      Grand Total — {grandTotals.lrs} records / {partyGroups.length} parties
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.freight)}</td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.lu)}</td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.other)}</td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.subtotal)}</td>
                    <td className="px-3 py-3 text-right font-bold text-white whitespace-nowrap">₹{inr(grandTotals.gst)}</td>
                    <td className="px-3 py-3 text-right font-bold text-yellow-300 whitespace-nowrap text-base">₹{inr(grandTotals.amount)}</td>
                    <td />
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
