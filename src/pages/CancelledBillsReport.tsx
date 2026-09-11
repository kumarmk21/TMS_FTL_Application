import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileSpreadsheet, Search, Calendar, Ban, FileX } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CancelledBillRecord {
  bill_type: string;
  bill_id: string;
  bill_number: string;
  bill_date: string | null;
  customer_name: string | null;
  customer_code: string | null;
  bill_amount: number | null;
  cancellation_reason: string | null;
  cancelled_by_name: string | null;
  cancelled_at: string | null;
}

export default function CancelledBillsReport() {
  const [records, setRecords] = useState<CancelledBillRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<CancelledBillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [billTypeFilter, setBillTypeFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [customers, setCustomers] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, fromDate, toDate, billTypeFilter, customerFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lrBills, warehouseBills] = await Promise.all([
        supabase
          .from('lr_bill')
          .select(`
            bill_id,
            lr_bill_number,
            lr_bill_date,
            billing_party_name,
            billing_party_code,
            bill_amount,
            cancellation_reason,
            cancelled_at,
            cancelled_by,
            profiles:cancelled_by (full_name)
          `)
          .eq('bill_status', 'Cancelled')
          .order('lr_bill_date', { ascending: false }),
        supabase
          .from('warehouse_bill')
          .select(`
            bill_id,
            bill_number,
            bill_date,
            billing_party_name,
            billing_party_code,
            total_amount,
            cancellation_reason,
            cancelled_at,
            cancelled_by,
            profiles:cancelled_by (full_name)
          `)
          .eq('bill_status', 'Cancelled')
          .order('bill_date', { ascending: false }),
      ]);

      if (lrBills.error) throw lrBills.error;
      if (warehouseBills.error) throw warehouseBills.error;

      const lrRecords: CancelledBillRecord[] = (lrBills.data || []).map((bill: any) => ({
        bill_type: 'Transportation (LR)',
        bill_id: bill.bill_id,
        bill_number: bill.lr_bill_number || '',
        bill_date: bill.lr_bill_date,
        customer_name: bill.billing_party_name,
        customer_code: bill.billing_party_code,
        bill_amount: bill.bill_amount || 0,
        cancellation_reason: bill.cancellation_reason,
        cancelled_by_name: bill.profiles?.full_name || null,
        cancelled_at: bill.cancelled_at,
      }));

      const whRecords: CancelledBillRecord[] = (warehouseBills.data || []).map((bill: any) => ({
        bill_type: 'Warehouse',
        bill_id: bill.bill_id,
        bill_number: bill.bill_number || '',
        bill_date: bill.bill_date,
        customer_name: bill.billing_party_name,
        customer_code: bill.billing_party_code,
        bill_amount: bill.total_amount || 0,
        cancellation_reason: bill.cancellation_reason,
        cancelled_by_name: bill.profiles?.full_name || null,
        cancelled_at: bill.cancelled_at,
      }));

      const allRecords = [...lrRecords, ...whRecords];
      allRecords.sort((a, b) => {
        const dateA = a.bill_date || '';
        const dateB = b.bill_date || '';
        return dateB.localeCompare(dateA);
      });

      setRecords(allRecords);

      const uniqueCustomers = [...new Set(allRecords.map(r => r.customer_name).filter(Boolean))] as string[];
      uniqueCustomers.sort();
      setCustomers(uniqueCustomers);
    } catch (error) {
      console.error('Error fetching cancelled bills:', error);
      alert('Error loading cancelled bills data');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        record.bill_number?.toLowerCase().includes(term) ||
        record.customer_name?.toLowerCase().includes(term) ||
        record.customer_code?.toLowerCase().includes(term) ||
        record.cancellation_reason?.toLowerCase().includes(term)
      );
    }

    if (fromDate) {
      filtered = filtered.filter(record => record.bill_date && record.bill_date >= fromDate);
    }

    if (toDate) {
      filtered = filtered.filter(record => record.bill_date && record.bill_date <= toDate);
    }

    if (billTypeFilter) {
      filtered = filtered.filter(record => record.bill_type === billTypeFilter);
    }

    if (customerFilter) {
      filtered = filtered.filter(record => record.customer_name === customerFilter);
    }

    setFilteredRecords(filtered);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '0.00';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToExcel = () => {
    const exportData = filteredRecords.map(record => ({
      'Bill Type': record.bill_type,
      'Bill Number': record.bill_number,
      'Bill Date': record.bill_date || '',
      'Customer Name': record.customer_name || '',
      'Customer Code': record.customer_code || '',
      'Bill Amount': record.bill_amount || 0,
      'Cancellation Reason': record.cancellation_reason || '',
      'Cancelled By': record.cancelled_by_name || '',
      'Cancelled At': record.cancelled_at ? formatDateTime(record.cancelled_at) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cancelled Bills');

    ws['!cols'] = [
      { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 25 },
      { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 22 },
    ];

    XLSX.writeFile(wb, `Cancelled_Bills_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalAmount = filteredRecords.reduce((sum, r) => sum + (r.bill_amount || 0), 0);
  const lrCount = filteredRecords.filter(r => r.bill_type === 'Transportation (LR)').length;
  const whCount = filteredRecords.filter(r => r.bill_type === 'Warehouse').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading cancelled bills...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ban className="w-7 h-7 text-red-600" />
            Cancelled Bills Report
          </h1>
          <p className="text-gray-600 mt-1">Cancelled Transportation and Warehouse bills with date and customer filters</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Cancelled Bills</div>
          <div className="text-2xl font-bold text-red-600">{filteredRecords.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Transportation Bills</div>
          <div className="text-2xl font-bold text-blue-600">{lrCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Warehouse Bills</div>
          <div className="text-2xl font-bold text-orange-600">{whCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Cancelled Amount</div>
          <div className="text-2xl font-bold text-gray-900">₹{formatCurrency(totalAmount)}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search bill no, customer..."
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
            value={billTypeFilter}
            onChange={(e) => setBillTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Bill Types</option>
            <option value="Transportation (LR)">Transportation (LR)</option>
            <option value="Warehouse">Warehouse</option>
          </select>

          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Customers</option>
            {customers.map(customer => (
              <option key={customer} value={customer}>{customer}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Code</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancellation Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancelled By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancelled At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <FileX className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    No cancelled bills found
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={`${record.bill_type}-${record.bill_id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        record.bill_type === 'Transportation (LR)'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {record.bill_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.bill_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(record.bill_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.customer_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      ₹{formatCurrency(record.bill_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <div className="truncate" title={record.cancellation_reason || ''}>
                        {record.cancellation_reason || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.cancelled_by_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(record.cancelled_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredRecords.length} of {records.length} cancelled bills
      </div>
    </div>
  );
}
