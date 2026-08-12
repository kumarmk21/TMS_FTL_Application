import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileDown, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface UnbilledLR {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  booking_branch: string;
  billing_party_name: string;
  from_city: string;
  to_city: string;
  vehicle_number: string;
  thc_no: string;
  subtotal: number;
  lr_total_amount: number;
}

export default function UnbilledReport() {
  const { profile } = useAuth();
  const [data, setData] = useState<UnbilledLR[]>([]);
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
        .select('tran_id, manual_lr_no, lr_date, booking_branch, billing_party_name, from_city, to_city, vehicle_number, thc_no, subtotal, lr_total_amount, bill_no')
        .gt('subtotal', 0)
        .or('bill_no.is.null,bill_no.eq.')
        .order('lr_date', { ascending: false });

      if (profile?.role === 'user' && profile?.branch_code) {
        query = query.eq('booking_branch', profile.branch_code);
      }

      const { data: rows, error } = await query;
      if (error) throw error;
      setData((rows || []) as UnbilledLR[]);
    } catch (error) {
      console.error('Error fetching unbilled LRs:', error);
      alert('Failed to load unbilled LR data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totals = data.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + (item.subtotal || 0),
      total: acc.total + (item.lr_total_amount || 0),
    }),
    { subtotal: 0, total: 0 }
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
        'Branch': item.booking_branch || '',
        'Customer Name': item.billing_party_name || '',
        'Origin': item.from_city || '',
        'Destination': item.to_city || '',
        'Vehicle Number': item.vehicle_number || '',
        'THC Number': item.thc_no || '',
        'Sub Total': item.subtotal || 0,
        'Gross Amount': item.lr_total_amount || 0,
      }));

      exportData.push({
        'Sr. No.': '',
        'LR Number': '',
        'LR Date': '',
        'Branch': '',
        'Customer Name': '',
        'Origin': '',
        'Destination': '',
        'Vehicle Number': '',
        'THC Number': 'TOTAL',
        'Sub Total': totals.subtotal,
        'Gross Amount': totals.total,
      } as any);

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 15 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Unbilled Report');
      XLSX.writeFile(workbook, `Unbilled_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      alert('Unbilled report exported successfully!');
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
        <h1 className="text-2xl font-bold text-gray-900">Unbilled Report</h1>
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
            <p className="text-xs text-gray-600 mb-1">Total Unbilled LRs</p>
            <p className="text-2xl font-bold text-blue-600">{data.length}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Sub Total</p>
            <p className="text-2xl font-bold text-indigo-600">
              ₹{totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Gross Amount</p>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Origin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vehicle Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">THC Number</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Sub Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Gross Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    No unbilled LRs found
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
                    <td className="px-4 py-3 text-sm text-gray-600">{item.booking_branch || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.billing_party_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.from_city || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.to_city || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.vehicle_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.thc_no || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      ₹{(item.subtotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                      ₹{(item.lr_total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={9} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    ₹{totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    ₹{totals.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
