import { useState } from 'react';
import { Download, Calendar, Loader2, CheckCircle, AlertCircle, FileDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface THCRecord {
  thc_id: string;
  thc_id_number: string;
  thc_date: string | null;
  lr_number: string | null;
  vehicle_number: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  thc_vendor: string;
  thc_balance_amount: number | null;
  ven_act_name: string | null;
  ven_act_number: string | null;
  ven_act_ifsc: string | null;
  ven_act_bank: string | null;
  ven_act_branch: string | null;
  thc_balance_payment_date: string | null;
  thc_munshiyana_amount: number | null;
  vendor_name?: string;
}

export default function DownloadBTHBankFile() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<THCRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleFetch = async () => {
    if (!selectedDate) return;
    setLoading(true);
    setSearched(true);
    setStatus('idle');
    setStatusMsg('');
    try {
      const { data, error } = await supabase
        .from('thc_details')
        .select(`
          thc_id, thc_id_number, thc_date, lr_number, vehicle_number,
          origin, destination, vehicle_type, thc_vendor,
          thc_balance_amount, ven_act_name, ven_act_number,
          ven_act_ifsc, ven_act_bank, ven_act_branch,
          thc_balance_payment_date, thc_munshiyana_amount
        `)
        .eq('thc_balance_payment_date', selectedDate)
        .order('thc_id_number', { ascending: true });

      if (error) throw error;

      const rows = data || [];
      if (rows.length > 0) {
        const vendorIds = [...new Set(rows.map(r => r.thc_vendor).filter(Boolean))];
        const { data: vendorData } = await supabase
          .from('vendor_master')
          .select('id, vendor_name')
          .in('id', vendorIds);
        const vMap = new Map((vendorData || []).map(v => [v.id, v.vendor_name]));
        setRecords(rows.map(r => ({ ...r, vendor_name: vMap.get(r.thc_vendor) || r.ven_act_name || 'Unknown' })));
      } else {
        setRecords([]);
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMsg('Failed to fetch records: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!records.length) return;

    const formattedDate = selectedDate
      ? new Date(selectedDate).toLocaleDateString('en-GB')
      : '';

    const lines = records.map(record => {
      const munshiyana = record.thc_munshiyana_amount ?? (
        (record.thc_balance_amount || 0) < 100000 ? 200 : 300
      );
      const netPayable = (record.thc_balance_amount || 0) - munshiyana;

      const fields = [
        'N',
        '',
        record.ven_act_number || '',
        netPayable.toFixed(2),
        record.vendor_name || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        record.vehicle_number || '',
        record.lr_number || '',
        record.thc_balance_amount?.toString() || '0',
        munshiyana.toFixed(2),
        record.origin || '',
        record.destination || '',
        record.vehicle_type || '',
        '',
        '',
        formattedDate,
        '',
        record.ven_act_ifsc || '',
        record.ven_act_bank || '',
        record.ven_act_branch || '',
        'dlslogisticsin@gmail.com',
      ];
      return fields.join(',');
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const filename = `2294${dd}${yy}_Balance.001`;

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatus('success');
    setStatusMsg(`Bank file downloaded: ${filename} (${records.length} records)`);
    setTimeout(() => setStatus('idle'), 5000);
  };

  const totalBalance = records.reduce((sum, r) => sum + (r.thc_balance_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <FileDown className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Download BTH Bank File</h1>
          <p className="text-sm text-gray-500">Download bank payment file for BTH payments made on a given date</p>
        </div>
      </div>

      {status !== 'idle' && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            status === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {status === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <p className="font-medium">{statusMsg}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Select Payment Date
        </h2>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Balance Payment Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSearched(false); setRecords([]); }}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleFetch}
            disabled={loading || !selectedDate}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Fetch Records
          </button>
        </div>
      </div>

      {searched && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">
                {records.length} record{records.length !== 1 ? 's' : ''} found
              </span>
              {records.length > 0 && (
                <span className="text-sm text-gray-500">
                  Total Balance:{' '}
                  <strong className="text-gray-800">
                    ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </span>
              )}
            </div>
            {records.length > 0 && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Bank File
              </button>
            )}
          </div>

          {records.length === 0 ? (
            <div className="py-16 text-center">
              <FileDown className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No BTH payment records found for the selected date.</p>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Account No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">IFSC</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Balance Paid</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Pmt Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r, i) => (
                    <tr key={r.thc_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.thc_id_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.thc_date || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.lr_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{r.vendor_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.vehicle_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.origin || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.destination || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.ven_act_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.ven_act_ifsc || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        ₹{(r.thc_balance_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.thc_balance_payment_date || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td colSpan={10} className="px-4 py-3 text-right text-gray-700 text-xs uppercase tracking-wide">Total</td>
                    <td className="px-4 py-3 text-right text-green-700">
                      ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
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
