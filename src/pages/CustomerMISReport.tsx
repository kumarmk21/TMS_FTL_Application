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
  act_wt: number;
  invoice_number: string;
  invoice_value: number;
  invoice_date: string;
  eway_bill_number: string;
  eway_bill_exp_date: string;
  vehicle_number: string;
  driver_number: string;
  driver_name: string;
  lr_status: string;
  pay_basis: string;
  product: string;
  created_at: string;
}

interface Branch {
  branch_code: string;
  branch_name: string;
}

export default function CustomerMISReport() {
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
      alert('Failed to load MIS data. Please try again.');
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
          item.to_city?.toLowerCase().includes(searchLower) ||
          item.eway_bill_number?.toLowerCase().includes(searchLower) ||
          item.vehicle_number?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredData(filtered);
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
        'Branch': item.booking_branch || '',
        'Consignor': item.consignor || '',
        'Consignee': item.consignee || '',
        'Billing Party': item.billing_party_name || '',
        'Origin': item.from_city || '',
        'Destination': item.to_city || '',
        'Vehicle Type': item.vehicle_type || '',
        'Vehicle Number': item.vehicle_number || '',
        'Driver Number': item.driver_number || '',
        'Driver Name': item.driver_name || '',
        'No. of Packages': item.no_of_pkgs || 0,
        'Actual Weight (KG)': item.act_wt || 0,
        'Chargeable Weight (KG)': item.chrg_wt || 0,
        'Invoice Number': item.invoice_number || '',
        'Invoice Date': item.invoice_date
          ? new Date(item.invoice_date).toLocaleDateString('en-IN')
          : '',
        'Invoice Value': item.invoice_value || 0,
        'E-Way Bill Number': item.eway_bill_number || '',
        'E-Way Bill Expiry': item.eway_bill_exp_date
          ? new Date(item.eway_bill_exp_date).toLocaleDateString('en-IN')
          : '',
        'Product': item.product || '',
        'Payment Basis': item.pay_basis || '',
        'LR Status': item.lr_status || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      const colWidths = [
        { wch: 8 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 12 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer MIS Report');

      const fileName = `Customer_MIS_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      alert('Customer MIS report exported successfully!');
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer MIS Report</h1>
          <p className="text-gray-600 mt-1">Comprehensive customer operations report</p>
        </div>
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
          <h2 className="text-lg font-semibold">Search Criteria</h2>
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
                placeholder="LR No, E-Way Bill, Vehicle..."
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
                  Consignor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Consignee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Route
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Vehicle No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Driver No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  E-Way Bill
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  E-Way Expiry
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                  Pkgs
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
                      {item.consignor || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.consignee || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.from_city} - {item.to_city || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.vehicle_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.driver_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.eway_bill_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.eway_bill_exp_date
                        ? new Date(item.eway_bill_exp_date).toLocaleDateString('en-IN')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {item.no_of_pkgs || 0}
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
