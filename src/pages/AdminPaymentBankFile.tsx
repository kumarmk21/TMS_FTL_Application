import { useState, useEffect } from 'react';
import { Search, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ExpenseRecord {
  expense_id: string;
  voucher_number: string | null;
  voucher_date: string;
  amount: number;
  payment_mode: string | null;
  reference_number: string | null;
  narration: string | null;
  account_id: string;
  vendor_id: string;
  bank_file_date: string | null;
  accounting_head?: string;
  account_sub_group?: string;
  vendor_name?: string;
  vendor_account_no?: string | null;
  vendor_bank?: string | null;
  vendor_ifsc?: string | null;
}

export default function AdminPaymentBankFile() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMode, setFilterMode] = useState<'pending' | 'done'>('pending');
  const [filterAccount, setFilterAccount] = useState('');
  const [accountOptions, setAccountOptions] = useState<{ id: string; accounting_head: string }[]>([]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetchAccountOptions();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fromDate, toDate, filterMode, filterAccount]);

  const fetchAccountOptions = async () => {
    const { data } = await supabase
      .from('accounts_master')
      .select('id, accounting_head')
      .eq('active', true)
      .order('accounting_head');
    if (data) setAccountOptions(data);
  };

  const fetchRecords = async () => {
    setLoading(true);
    setStatus('idle');
    setStatusMsg('');
    try {
      let query = supabase
        .from('admin_expenses_transaction')
        .select('expense_id, voucher_number, voucher_date, amount, payment_mode, reference_number, narration, account_id, vendor_id, bank_file_date')
        .or('is_cancelled.is.null,is_cancelled.eq.false')
        .neq('payment_mode', 'Cash')
        .gte('voucher_date', fromDate)
        .lte('voucher_date', toDate)
        .order('voucher_date', { ascending: true });

      if (filterMode === 'pending') query = query.is('bank_file_date', null);
      if (filterMode === 'done') query = query.not('bank_file_date', 'is', null);
      if (filterAccount) query = query.eq('account_id', filterAccount);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const accIds = [...new Set(data.map(r => r.account_id))];
        const venIds = [...new Set(data.map(r => r.vendor_id))];

        const [accRes, venRes] = await Promise.all([
          supabase.from('accounts_master').select('id, accounting_head, sub_group').in('id', accIds),
          supabase.from('vendor_master').select('id, vendor_name, account_no, bank_name, ifsc_code').in('id', venIds),
        ]);

        const accMap = new Map(accRes.data?.map(a => [a.id, a]) || []);
        const venMap = new Map(venRes.data?.map(v => [v.id, v]) || []);

        const enriched = data.map(r => ({
          ...r,
          accounting_head: accMap.get(r.account_id)?.accounting_head || 'Unknown',
          account_sub_group: accMap.get(r.account_id)?.sub_group || '',
          vendor_name: venMap.get(r.vendor_id)?.vendor_name || 'Unknown',
          vendor_account_no: venMap.get(r.vendor_id)?.account_no || null,
          vendor_bank: venMap.get(r.vendor_id)?.bank_name || null,
          vendor_ifsc: venMap.get(r.vendor_id)?.ifsc_code || null,
        }));
        setRecords(enriched);
      } else {
        setRecords([]);
      }
    } catch (err: any) {
      console.error('Error fetching records:', err);
      setStatus('error');
      setStatusMsg('Failed to fetch records: ' + (err.message || 'Unknown error'));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.expense_id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedRecords);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRecords(next);
  };

  const generateCSV = (data: ExpenseRecord[]): string => {
    const formattedDate = paymentDate ? new Date(paymentDate).toLocaleDateString('en-GB') : '';
    return data.map(r => {
      const fields = [
        'N',
        '',
        r.vendor_account_no || '',
        r.amount.toFixed(2),
        r.vendor_name || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        r.voucher_number || '',
        r.narration || '',
        r.amount.toFixed(2),
        r.amount.toFixed(2),
        '',
        '',
        r.payment_mode || '',
        '',
        '',
        formattedDate,
        '',
        r.vendor_ifsc || '',
        r.vendor_bank || '',
        '',
        'dlslogisticsin@gmail.com',
      ];
      return fields.join(',');
    }).join('\n');
  };

  const handleSubmit = async () => {
    if (selectedRecords.size === 0) {
      alert('Please select at least one record');
      return;
    }
    setStatus('processing');
    setStatusMsg('Generating bank file and updating records...');
    try {
      const selectedData = records.filter(r => selectedRecords.has(r.expense_id));

      const { error } = await supabase
        .from('admin_expenses_transaction')
        .update({ bank_file_date: paymentDate })
        .in('expense_id', Array.from(selectedRecords));

      if (error) throw error;

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const filename = `2294${dd}${yy}_Admin.001`;

      const csvContent = generateCSV(selectedData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus('success');
      setStatusMsg(`Bank file generated: ${filename}`);
      setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 5000);
      setSelectedRecords(new Set());
      fetchRecords();
    } catch (err: any) {
      setStatus('error');
      setStatusMsg('Failed to generate bank file: ' + err.message);
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const selectedTotal = records
    .filter(r => selectedRecords.has(r.expense_id))
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Payment Bank File</h1>
      </div>

      {status !== 'idle' && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${
          status === 'success' ? 'bg-green-50 border-green-200 text-green-800'
          : status === 'error' ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {status === 'processing' && <Loader2 className="w-5 h-5 animate-spin flex-shrink-0 mt-0.5" />}
          {status === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          {status === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <p className="font-medium">{statusMsg}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterMode('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterMode === 'pending' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending Export
              </button>
              <button
                onClick={() => setFilterMode('done')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterMode === 'done' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Already Exported
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                value={filterAccount}
                onChange={e => setFilterAccount(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">All Accounts</option>
                {accountOptions.map(a => (
                  <option key={a.id} value={a.id}>{a.accounting_head}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {filterMode === 'pending' && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={records.length > 0 && selectedRecords.size === records.length}
                      onChange={toggleSelectAll}
                      disabled={records.length === 0}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Head</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor / Payee</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IFSC</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                {filterMode === 'done' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank File Date</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={filterMode === 'pending' ? 12 : 12} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={filterMode === 'pending' ? 12 : 12} className="px-4 py-12 text-center text-gray-500">
                    No records found for selected filters
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.expense_id} className={`hover:bg-gray-50 ${selectedRecords.has(r.expense_id) ? 'bg-red-50' : ''}`}>
                    {filterMode === 'pending' && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRecords.has(r.expense_id)}
                          onChange={() => toggleSelect(r.expense_id)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{r.voucher_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.voucher_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>{r.accounting_head}</div>
                      <div className="text-xs text-gray-400">{r.account_sub_group}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.vendor_name}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                      ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.payment_mode || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.reference_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate" title={r.narration || ''}>{r.narration || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.vendor_account_no || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.vendor_ifsc || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.vendor_bank || '-'}</td>
                    {filterMode === 'done' && (
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.bank_file_date || '-'}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {records.length > 0 && filterMode === 'pending' && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                Selected: <span className="font-semibold">{selectedRecords.size}</span> of{' '}
                <span className="font-semibold">{records.length}</span> records
              </p>
              {selectedRecords.size > 0 && (
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-medium">Selected Amount</p>
                    <p className="text-lg font-bold text-red-600">
                      ₹{selectedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Payment Date:</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={selectedRecords.size === 0 || status === 'processing'}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Download className="w-4 h-4" />
                Generate Bank File
              </button>
            </div>
          </div>
        )}

        {records.length > 0 && filterMode === 'done' && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Total records: <span className="font-semibold">{records.length}</span>
              {' '} | Total amount: <span className="font-semibold">
                ₹{records.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
