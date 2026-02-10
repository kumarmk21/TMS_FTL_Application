import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileDown, Search, Loader2, Filter, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BookingLR {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  booking_branch: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  consignor: string;
  consignee: string;
  billing_party_name: string;
  no_of_pkgs: number;
  chrg_wt: number;
  freight_type: string;
  freight_rate: number;
  freight_amount: number;
  loading_charges: number;
  unloading_charges: number;
  detention_charges: number;
  docket_charges: number;
  penalties_oth_charges: number;
  subtotal: number;
  gst_charge_type: string;
  gst_amount: number;
  lr_total_amount: number;
  lr_status: string;
  lr_financial_status: string;
  pay_basis: string;
  invoice_number: string;
  invoice_value: number;
  bill_no: string;
  bill_date: string;
  created_at: string;
}

interface Branch {
  branch_code: string;
  branch_name: string;
}

export default function SalesReport() {
  const { profile } = useAuth();
  const [bookingData, setBookingData] = useState<BookingLR[]>([]);
  const [filteredData, setFilteredData] = useState<BookingLR[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    branch: '',
    status: '',
    searchTerm: '',
  });

  useEffect(() => {
    fetchBranches();
    fetchBookingData();
  }, [profile]);

  useEffect(() => {
    applyFilters();
  }, [bookingData, filters]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_master')
        .select('branch_code, branch_name')
        .order('branch_name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchBookingData = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('booking_lr')
        .select('*')
        .order('lr_date', { ascending: false });

      if (profile?.role === 'user' && profile?.branch_code) {
        query = query.eq('booking_branch', profile.branch_code);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBookingData(data || []);
    } catch (error) {
      console.error('Error fetching booking data:', error);
      alert('Failed to load sales data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookingData];

    if (filters.fromDate) {
      filtered = filtered.filter(
        (item) => new Date(item.lr_date) >= new Date(filters.fromDate)
      );
    }

    if (filters.toDate) {
      filtered = filtered.filter(
        (item) => new Date(item.lr_date) <= new Date(filters.toDate)
      );
    }

    if (filters.branch) {
      filtered = filtered.filter((item) => item.booking_branch === filters.branch);
    }

    if (filters.status) {
      filtered = filtered.filter((item) => item.lr_status === filters.status);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.manual_lr_no?.toLowerCase().includes(searchLower) ||
          item.consignor?.toLowerCase().includes(searchLower) ||
          item.consignee?.toLowerCase().includes(searchLower) ||
          item.billing_party_name?.toLowerCase().includes(searchLower) ||
          item.from_city?.toLowerCase().includes(searchLower) ||
          item.to_city?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredData(filtered);
  };

  const calculateTotals = () => {
    const totals = filteredData.reduce(
      (acc, item) => ({
        freight_amount: acc.freight_amount + (item.freight_amount || 0),
        loading_charges: acc.loading_charges + (item.loading_charges || 0),
        unloading_charges: acc.unloading_charges + (item.unloading_charges || 0),
        detention_charges: acc.detention_charges + (item.detention_charges || 0),
        other_charges:
          acc.other_charges +
          (item.docket_charges || 0) +
          (item.penalties_oth_charges || 0),
        subtotal: acc.subtotal + (item.subtotal || 0),
        gst_amount: acc.gst_amount + (item.gst_amount || 0),
        total_amount: acc.total_amount + (item.lr_total_amount || 0),
      }),
      {
        freight_amount: 0,
        loading_charges: 0,
        unloading_charges: 0,
        detention_charges: 0,
        other_charges: 0,
        subtotal: 0,
        gst_amount: 0,
        total_amount: 0,
      }
    );
    return totals;
  };

  const exportToExcel = () => {
    try {
      setExporting(true);

      const exportData = filteredData.map((item, index) => ({
        'Sr. No.': index + 1,
        'LR Number': item.manual_lr_no || '',
        'LR Date': item.lr_date
          ? new Date(item.lr_date).toLocaleDateString('en-IN')
          : '',
        'Freight Bill Number': item.bill_no || '',
        'Bill Date': item.bill_date
          ? new Date(item.bill_date).toLocaleDateString('en-IN')
          : '',
        'Branch': item.booking_branch || '',
        'Consignor': item.consignor || '',
        'Consignee': item.consignee || '',
        'Billing Party': item.billing_party_name || '',
        'Origin': item.from_city || '',
        'Destination': item.to_city || '',
        'Vehicle Type': item.vehicle_type || '',
        'No. of Packages': item.no_of_pkgs || 0,
        'Chargeable Weight (KG)': item.chrg_wt || 0,
        'Freight Type': item.freight_type || '',
        'Freight Rate': item.freight_rate || 0,
        'Freight Amount': item.freight_amount || 0,
        'Loading Charges': item.loading_charges || 0,
        'Unloading Charges': item.unloading_charges || 0,
        'Detention Charges': item.detention_charges || 0,
        'Docket Charges': item.docket_charges || 0,
        'Other Charges': item.penalties_oth_charges || 0,
        'Subtotal': item.subtotal || 0,
        'GST Type': item.gst_charge_type || '',
        'GST Amount': item.gst_amount || 0,
        'Total Amount': item.lr_total_amount || 0,
        'Payment Basis': item.pay_basis || '',
        'LR Status': item.lr_status || '',
        'Financial Status': item.lr_financial_status || '',
        'Invoice Number': item.invoice_number || '',
        'Invoice Value': item.invoice_value || 0,
      }));

      const totals = calculateTotals();
      exportData.push({
        'Sr. No.': '',
        'LR Number': '',
        'LR Date': '',
        'Freight Bill Number': '',
        'Bill Date': '',
        'Branch': '',
        'Consignor': '',
        'Consignee': '',
        'Billing Party': '',
        'Origin': '',
        'Destination': '',
        'Vehicle Type': '',
        'No. of Packages': '',
        'Chargeable Weight (KG)': '',
        'Freight Type': '',
        'Freight Rate': 'TOTAL',
        'Freight Amount': totals.freight_amount,
        'Loading Charges': totals.loading_charges,
        'Unloading Charges': totals.unloading_charges,
        'Detention Charges': totals.detention_charges,
        'Docket Charges': '',
        'Other Charges': totals.other_charges,
        'Subtotal': totals.subtotal,
        'GST Type': '',
        'GST Amount': totals.gst_amount,
        'Total Amount': totals.total_amount,
        'Payment Basis': '',
        'LR Status': '',
        'Financial Status': '',
        'Invoice Number': '',
        'Invoice Value': '',
      } as any);

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      const colWidths = [
        { wch: 8 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

      const fileName = `Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      alert('Sales report exported successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const totals = calculateTotals();

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
        <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
        <button
          onClick={exportToExcel}
          disabled={exporting || filteredData.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <FileDown className="w-5 h-5" />
          )}
          Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 mb-4">
          <Filter className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <select
              value={filters.branch}
              onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={profile?.role === 'user'}
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.branch_code} value={branch.branch_code}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="LR No, Consignor, City..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing {filteredData.length} of {bookingData.length} records
          </p>
          <button
            onClick={() =>
              setFilters({
                fromDate: '',
                toDate: '',
                branch: '',
                status: '',
                searchTerm: '',
              })
            }
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Freight</p>
            <p className="text-lg font-bold text-blue-600">
              ₹{totals.freight_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Loading</p>
            <p className="text-lg font-bold text-green-600">
              ₹{totals.loading_charges.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Unloading</p>
            <p className="text-lg font-bold text-yellow-600">
              ₹{totals.unloading_charges.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Detention</p>
            <p className="text-lg font-bold text-orange-600">
              ₹{totals.detention_charges.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Other</p>
            <p className="text-lg font-bold text-purple-600">
              ₹{totals.other_charges.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Subtotal</p>
            <p className="text-lg font-bold text-indigo-600">
              ₹{totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-pink-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">GST</p>
            <p className="text-lg font-bold text-pink-600">
              ₹{totals.gst_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total</p>
            <p className="text-lg font-bold text-red-600">
              ₹{totals.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  LR No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Branch
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Billing Party
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Bill No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Bill Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Route
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                  Freight
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                  GST
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.tran_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.manual_lr_no}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.lr_date
                        ? new Date(item.lr_date).toLocaleDateString('en-IN')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.booking_branch}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.billing_party_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.bill_no || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.bill_date
                        ? new Date(item.bill_date).toLocaleDateString('en-IN')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.from_city} - {item.to_city || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.vehicle_type || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      ₹{(item.freight_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      ₹{(item.gst_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                      ₹{(item.lr_total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.lr_status === 'Delivered'
                            ? 'bg-green-100 text-green-800'
                            : item.lr_status === 'In Transit'
                            ? 'bg-blue-100 text-blue-800'
                            : item.lr_status === 'Confirmed'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.lr_status === 'Cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.lr_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
