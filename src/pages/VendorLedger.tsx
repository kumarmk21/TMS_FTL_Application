import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Loader2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  buildVendorLedger,
  type LedgerEntryType,
  type VendorThcRow,
} from '../lib/vendorLedger';
import {
  displayDate,
  exportVendorLedgerExcel,
  exportVendorLedgerPdf,
  money,
  type LedgerCompany,
} from '../lib/vendorLedgerExport';

interface VendorOption {
  id: string;
  vendor_name: string;
}

interface AppliedRange {
  vendorId: string;
  vendorName: string;
  fromDate: string;
  toDate: string;
}

const toIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const TYPE_STYLES: Record<LedgerEntryType, string> = {
  THC: 'bg-sky-50 text-sky-700 ring-sky-200',
  Advance: 'bg-amber-50 text-amber-700 ring-amber-200',
  'BTH Paid': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export default function VendorLedger() {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [company, setCompany] = useState<LedgerCompany | null>(null);
  const [vendorId, setVendorId] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [toDate, setToDate] = useState(() => toIsoDate(new Date()));
  const [thcs, setThcs] = useState<VendorThcRow[]>([]);
  const [applied, setApplied] = useState<AppliedRange | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    const loadMasters = async () => {
      const [vendorResult, companyResult] = await Promise.all([
        supabase.from('vendor_master').select('id, vendor_name').order('vendor_name', { ascending: true }),
        supabase
          .from('company_master')
          .select('company_name, company_tagline, company_address, city, state, pin_code, contact_number, email, website, logo_url')
          .limit(1)
          .maybeSingle(),
      ]);
      if (vendorResult.error) {
        setError('Could not load the vendor list. Please refresh the page.');
        return;
      }
      setVendors((vendorResult.data as VendorOption[]) || []);
      if (!companyResult.error && companyResult.data) setCompany(companyResult.data as LedgerCompany);
    };
    loadMasters();
  }, []);

  const canShow = !!vendorId && !!fromDate && !!toDate && fromDate <= toDate && !loading;

  const handleShowLedger = async () => {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('thc_details')
      .select('thc_id, thc_id_number, thc_date, lr_number, vehicle_number, thc_amount, thc_advance_amount, thc_advance_date, thc_balance_amount, thc_balance_payment_date')
      .eq('thc_vendor', vendorId)
      .order('thc_date', { ascending: true });
    setLoading(false);
    if (fetchError) {
      setError('Could not load this vendor\'s transactions. Please try again.');
      setThcs([]);
      setApplied(null);
      return;
    }
    setThcs((data as VendorThcRow[]) || []);
    setApplied({ vendorId, vendorName: vendor.vendor_name, fromDate, toDate });
  };

  const ledger = useMemo(
    () => (applied ? buildVendorLedger(thcs, applied.fromDate, applied.toDate) : null),
    [applied, thcs]
  );

  const handleExport = async (kind: 'excel' | 'pdf') => {
    if (!ledger || !applied) return;
    const meta = { vendorName: applied.vendorName, fromDate: applied.fromDate, toDate: applied.toDate };
    setExporting(kind);
    try {
      if (kind === 'excel') exportVendorLedgerExcel(ledger, meta);
      else await exportVendorLedgerPdf(ledger, meta, company);
    } catch (err) {
      console.error('Vendor ledger export failed:', err);
      setError(`Could not create the ${kind === 'excel' ? 'Excel' : 'PDF'} file. Please try again.`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Ledger</h1>
        <p className="mt-1 text-sm text-slate-600">
          Select a vendor and date range to view opening balance, THC credits, advances and balance payments.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="ledger-vendor" className="mb-1 block text-sm font-medium text-slate-700">
              Vendor
            </label>
            <select
              id="ledger-vendor"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">Select a vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vendor_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ledger-from" className="mb-1 block text-sm font-medium text-slate-700">
              From date
            </label>
            <input
              id="ledger-from"
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div>
            <label htmlFor="ledger-to" className="mb-1 block text-sm font-medium text-slate-700">
              To date
            </label>
            <input
              id="ledger-to"
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {fromDate > toDate ? (
            <p className="text-sm text-red-600">The from date must be on or before the to date.</p>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleShowLedger}
            disabled={!canShow}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Loading...' : 'Show Ledger'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {ledger && applied && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{applied.vendorName}</h2>
              <p className="text-sm text-slate-600">
                {displayDate(applied.fromDate)} to {displayDate(applied.toDate)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleExport('excel')}
                disabled={exporting !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Export PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Opening Balance', value: ledger.opening, tone: 'text-slate-900' },
              { label: 'Credit Amount', value: ledger.totalCredit, tone: 'text-sky-700' },
              { label: 'Debit Amount', value: ledger.totalDebit, tone: 'text-emerald-700' },
              { label: 'Balance Amount', value: ledger.closing, tone: 'text-slate-900' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-600">{card.label}</p>
                <p className={`mt-1 text-xl font-semibold ${card.tone}`}>{money(card.value)}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">LR Number</th>
                  <th className="px-4 py-3 font-medium">Vehicle Number</th>
                  <th className="px-4 py-3 font-medium">THC Number</th>
                  <th className="px-4 py-3 text-right font-medium">Credit Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Debit Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Balance Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td colSpan={7} className="px-4 py-3">Opening Balance</td>
                  <td className="px-4 py-3 text-right">{money(ledger.opening)}</td>
                </tr>
                {ledger.lines.map((line, index) => (
                  <tr key={`${line.type}-${line.thcNumber}-${line.date}-${index}`} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{displayDate(line.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TYPE_STYLES[line.type]}`}>
                        {line.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{line.lrNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{line.vehicleNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{line.thcNumber}</td>
                    <td className="px-4 py-3 text-right text-sky-700">{line.credit ? money(line.credit) : ''}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{line.debit ? money(line.debit) : ''}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{money(line.balance)}</td>
                  </tr>
                ))}
                {ledger.lines.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No transactions in this date range.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-slate-900">
                <tr>
                  <td colSpan={5} className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right text-sky-700">{money(ledger.totalCredit)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{money(ledger.totalDebit)}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={7} className="px-4 py-3">Closing Balance (Opening + Credit - Debit)</td>
                  <td className="px-4 py-3 text-right">{money(ledger.closing)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
