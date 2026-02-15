import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileSpreadsheet, Search, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';

interface IncomeExpenseRecord {
  tran_id: string;
  lr_date: string | null;
  lr_number: string | null;
  origin: string | null;
  destination: string | null;
  billing_party_name: string | null;
  freight_amount: number | null;
  bill_no: string | null;
  thc_number: string | null;
  vehicle_number: string | null;
  vendor_name: string | null;
  vendor_code: string | null;
  thc_gross_amount: number | null;
  thc_advance_amount: number | null;
  thc_balance_amount: number | null;
  profit: number | null;
  vehicle_type: string | null;
  lr_status: string | null;
  thc_status: string | null;
}

export default function IncomeExpenseReport() {
  const [records, setRecords] = useState<IncomeExpenseRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<IncomeExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [origins, setOrigins] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, fromDate, toDate, selectedOrigin, selectedDestination]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select(`
          tran_id,
          lr_date,
          manual_lr_no,
          from_city,
          to_city,
          billing_party_name,
          freight_amount,
          bill_no,
          vehicle_type,
          lr_status,
          thc_details!thc_details_tran_id_fkey (
            thc_number,
            vehicle_number,
            thc_gross_amount,
            thc_advance_amount,
            thc_balance_amount,
            thc_vendor,
            origin,
            destination,
            thc_status_ops,
            vendor_master!thc_details_thc_vendor_fkey (
              vendor_name,
              vendor_code
            )
          )
        `)
        .order('lr_date', { ascending: false });

      if (error) throw error;

      const formattedData: IncomeExpenseRecord[] = (data || []).map((record: any) => {
        const thc = record.thc_details?.[0];
        const vendor = thc?.vendor_master;
        const freightAmount = record.freight_amount || 0;
        const grossAmount = thc?.thc_gross_amount || 0;
        const profit = freightAmount - grossAmount;

        return {
          tran_id: record.tran_id,
          lr_date: record.lr_date,
          lr_number: record.manual_lr_no,
          origin: thc?.origin || record.from_city,
          destination: thc?.destination || record.to_city,
          billing_party_name: record.billing_party_name,
          freight_amount: freightAmount,
          bill_no: record.bill_no,
          thc_number: thc?.thc_number,
          vehicle_number: thc?.vehicle_number,
          vendor_name: vendor?.vendor_name,
          vendor_code: vendor?.vendor_code,
          thc_gross_amount: grossAmount,
          thc_advance_amount: thc?.thc_advance_amount || 0,
          thc_balance_amount: thc?.thc_balance_amount || 0,
          profit,
          vehicle_type: record.vehicle_type,
          lr_status: record.lr_status,
          thc_status: thc?.thc_status_ops
        };
      });

      setRecords(formattedData);

      const uniqueOrigins = [...new Set(formattedData.map(r => r.origin).filter(Boolean))].sort() as string[];
      const uniqueDestinations = [...new Set(formattedData.map(r => r.destination).filter(Boolean))].sort() as string[];
      setOrigins(uniqueOrigins);
      setDestinations(uniqueDestinations);
    } catch (error) {
      console.error('Error fetching income/expense data:', error);
      alert('Error loading income/expense data');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        record.lr_number?.toLowerCase().includes(term) ||
        record.billing_party_name?.toLowerCase().includes(term) ||
        record.thc_number?.toLowerCase().includes(term) ||
        record.vehicle_number?.toLowerCase().includes(term) ||
        record.vendor_name?.toLowerCase().includes(term)
      );
    }

    if (fromDate) {
      filtered = filtered.filter(record =>
        record.lr_date && record.lr_date >= fromDate
      );
    }

    if (toDate) {
      filtered = filtered.filter(record =>
        record.lr_date && record.lr_date <= toDate
      );
    }

    if (selectedOrigin) {
      filtered = filtered.filter(record => record.origin === selectedOrigin);
    }

    if (selectedDestination) {
      filtered = filtered.filter(record => record.destination === selectedDestination);
    }

    setFilteredRecords(filtered);
  };

  const calculateTotals = () => {
    const totalFreight = filteredRecords.reduce((sum, record) => sum + (record.freight_amount || 0), 0);
    const totalGross = filteredRecords.reduce((sum, record) => sum + (record.thc_gross_amount || 0), 0);
    const totalAdvance = filteredRecords.reduce((sum, record) => sum + (record.thc_advance_amount || 0), 0);
    const totalBalance = filteredRecords.reduce((sum, record) => sum + (record.thc_balance_amount || 0), 0);
    const totalProfit = totalFreight - totalGross;

    return { totalFreight, totalGross, totalAdvance, totalBalance, totalProfit };
  };

  const exportToExcel = () => {
    const exportData = filteredRecords.map(record => ({
      'LR Date': record.lr_date || '',
      'LR Number': record.lr_number || '',
      'Origin': record.origin || '',
      'Destination': record.destination || '',
      'Billing Party': record.billing_party_name || '',
      'Freight Amount': record.freight_amount || 0,
      'Bill Number': record.bill_no || '',
      'THC Number': record.thc_number || '',
      'Vehicle Number': record.vehicle_number || '',
      'Vendor': record.vendor_name ? `${record.vendor_name} (${record.vendor_code})` : '',
      'Gross Amount': record.thc_gross_amount || 0,
      'ATH Amount': record.thc_advance_amount || 0,
      'BTH Amount': record.thc_balance_amount || 0,
      'Profit': record.profit || 0,
      'Vehicle Type': record.vehicle_type || '',
      'LR Status': record.lr_status || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income Expense Report');

    const colWidths = [
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Income_Expense_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '0.00';
    return amount.toFixed(2);
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading income/expense data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-green-600" />
            Income / Expense Report
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive financial analysis of LR bookings and THC costs</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Freight</div>
          <div className="text-2xl font-bold text-green-600">₹{formatCurrency(totals.totalFreight)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Expense</div>
          <div className="text-2xl font-bold text-red-600">₹{formatCurrency(totals.totalGross)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Profit</div>
          <div className={`text-2xl font-bold ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{formatCurrency(totals.totalProfit)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Advance Paid</div>
          <div className="text-2xl font-bold text-blue-600">₹{formatCurrency(totals.totalAdvance)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Balance Due</div>
          <div className="text-2xl font-bold text-orange-600">₹{formatCurrency(totals.totalBalance)}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search LR, Party, THC, Vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From Date"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To Date"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedOrigin}
            onChange={(e) => setSelectedOrigin(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Origins</option>
            {origins.map(origin => (
              <option key={origin} value={origin}>{origin}</option>
            ))}
          </select>

          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Destinations</option>
            {destinations.map(destination => (
              <option key={destination} value={destination}>{destination}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Party</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Freight</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">THC No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Amt</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ATH Amt</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">BTH Amt</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.tran_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.lr_date ? new Date(record.lr_date).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{record.lr_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.origin || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.destination || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.billing_party_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      ₹{formatCurrency(record.freight_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.bill_no || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.thc_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.vehicle_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.vendor_name ? `${record.vendor_name} (${record.vendor_code})` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                      ₹{formatCurrency(record.thc_gross_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      ₹{formatCurrency(record.thc_advance_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      ₹{formatCurrency(record.thc_balance_amount)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${
                      (record.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{formatCurrency(record.profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredRecords.length} of {records.length} records
      </div>
    </div>
  );
}
