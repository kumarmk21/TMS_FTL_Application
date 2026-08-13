import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileDown, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LRPendingFinEdit {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  from_city: string;
  to_city: string;
  consignor: string;
  consignee: string;
  billing_party_name: string;
  vehicle_number: string;
  pay_basis: string;
  freight_amount: number | null;
  lr_total_amount: number;
  lr_financial_status: string;
  bill_no: string | null;
}

export default function LRPendingFinEditReport() {
  const { profile } = useAuth();
  const [data, setData] = useState<LRPendingFinEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('booking_lr')
        .select('tran_id, manual_lr_no, lr_date, from_city, to_city, consignor, consignee, billing_party_name, vehicle_number, pay_basis, freight_amount, lr_total_amount, lr_financial_status, bill_no')
        .eq('pay_basis', 'TBB')
        .or('freight_amount.is.null,freight_amount.eq.0')
        .order('lr_date', { ascending: false });

      if (profile?.role === 'user' && profile?.branch_code) {
        query = query.eq('booking_branch', profile.branch_code);
      }

      const { data: rows, error } = await query;
      if (error) throw error;
      setData((rows || []) as LRPendingFinEdit[]);
    } catch (error) {
      console.error('Error fetching LRs pending financial edit:', error);
      alert('Failed to load LR data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totals = data.reduce(
    (acc, item) => ({
      freight: acc.freight + (item.freight_amount || 0),
      total: acc.total + (item.lr_total_amount || 0),
    }),
    { freight: 0, total: 0 }
  );

  const exportToExcel = () => {
    try {
      setExporting(true);
      const exportData = data.map((item, index) => ({
        'Sr. No.': index + 1,
        'LR Number': item.manual_lr_no || '',
        'LR Date': item.lr_date
          ? (() => { const d = new Date(item.lr_date); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; })()
          : '',
        'Origin': item.from_city || '',
        'Destination': item.to_city || '',
        'Consignor': item.consignor || '',
        'Consignee': item.consignee || '',
        'Billing Party': item.billing_party_name || '',
        'Vehicle Number': item.vehicle_number || '',
        'Pay Basis': item.pay_basis || '',
        'Freight Amount': item.freight_amount || 0,
        'LR Total Amount': item.lr_total_amount || 0,
        'Financial Status': item.lr_financial_status || '',
        'Bill No': item.bill_no || '',
      }));

      exportData.push({
        'Sr. No.': '',
        'LR Number': '',
        'LR Date': '',
        'Origin': '',
        'Destination': '',
        'Consignor': '',
        'Consignee': '',
        'Billing Party': '',
        'Vehicle Number': '',
        'Pay Basis': 'TOTAL',
        'Freight Amount': totals.freight,
        'LR Total Amount': totals.total,
        'Financial Status': '',
        'Bill No': '',
      } as any);

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
        { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 10 },
        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'LR Pending Fin Edit');
      XLSX.writeFile(workbook, `LR_Pending_Fin_Edit_${new Date().toISOString().split('T')[0]}.xlsx`);
      alert('Report exported successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">LR Pending for Fin Edit</h1>
        <button
          onClick={exportToExcel}
          disabled={exporting || data.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
          Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total LRs Pending</p>
            <p className="text-2xl font-bold text-blue-600">{data.length}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Freight Amount</p>
            <p className="text-2xl font-bold text-amber-600">
              ₹{totals.freight.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total LR Amount</p>
            <p className="text-2xl font-bold text-red-600">
              ₹{totals.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sr. No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">LR No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">LR Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Origin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Consignor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Consignee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Billing Party</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vehicle Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pay Basis</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Freight Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">LR Total Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fin. Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Bill No</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                    No LRs pending for financial edit
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.tran_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.manual_lr_no || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.lr_date ? new Date(item.lr_date).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.from_city || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.to_city || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.consignor || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.consignee || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.billing_party_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.vehicle_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.pay_basis || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      ₹{(item.freight_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                      ₹{(item.lr_total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.lr_financial_status || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.bill_no || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={10} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    ₹{totals.freight.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    ₹{totals.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
