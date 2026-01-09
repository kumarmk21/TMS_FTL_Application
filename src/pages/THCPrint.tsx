import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Printer, Eye, Loader2, FileText } from 'lucide-react';
import { THCPrintPreview } from '../components/THCPrintPreview';

interface THCRecord {
  thc_id: string;
  thc_id_number: string;
  thc_number: string;
  thc_date: string;
  thc_vendor: string;
  vehicle_number: string;
  lr_number: string;
  thc_gross_amount: number;
  thc_advance_amount: number;
  thc_tds_amount: number;
  thc_net_payable_amount: number;
  thc_balance_amount: number;
  thc_status_ops: string | null;
  thc_status_fin: string | null;
  vendor_master?: {
    vendor_name: string;
    vendor_code: string;
  };
  status_ops?: {
    status_name: string;
  };
  status_fin?: {
    status_name: string;
  };
}

export function THCPrint() {
  const [thcRecords, setThcRecords] = useState<THCRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<THCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTHC, setSelectedTHC] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + (6 - today.getDay()));

    setStartDate(weekStart.toISOString().split('T')[0]);
    setEndDate(weekEnd.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchTHCRecords();
    }
  }, [startDate, endDate]);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, thcRecords]);

  const fetchTHCRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('thc_details')
        .select(`
          thc_id,
          thc_id_number,
          thc_number,
          thc_date,
          thc_vendor,
          vehicle_number,
          lr_number,
          thc_gross_amount,
          thc_advance_amount,
          thc_tds_amount,
          thc_net_payable_amount,
          thc_balance_amount,
          thc_status_ops,
          thc_status_fin,
          vendor_master:thc_vendor (
            vendor_name,
            vendor_code
          ),
          status_ops:thc_status_ops (
            status_name
          ),
          status_fin:thc_status_fin (
            status_name
          )
        `)
        .gte('thc_date', startDate)
        .lte('thc_date', endDate)
        .order('thc_date', { ascending: false });

      if (error) throw error;
      setThcRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching THC records:', error);
      alert(error.message || 'Failed to fetch THC records');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    if (!searchTerm.trim()) {
      setFilteredRecords(thcRecords);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = thcRecords.filter(
      (record) =>
        record.thc_id_number?.toLowerCase().includes(term) ||
        record.thc_number?.toLowerCase().includes(term) ||
        record.lr_number?.toLowerCase().includes(term) ||
        record.vehicle_number?.toLowerCase().includes(term) ||
        record.vendor_master?.vendor_name?.toLowerCase().includes(term) ||
        record.vendor_master?.vendor_code?.toLowerCase().includes(term)
    );
    setFilteredRecords(filtered);
  };

  const handleSearch = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date cannot be after end date');
      return;
    }
    fetchTHCRecords();
  };

  const handlePrint = (thcId: string) => {
    setSelectedTHC(thcId);
    setIsPrintModalOpen(true);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">THC Print</h1>
          <p className="text-sm text-gray-600 mt-1">
            Search and print THC documents
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search by Bhada Chalan, LR Number, or Vehicle
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm
                ? 'No THC records found matching your search'
                : 'No THC records found for the selected date range'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Try adjusting your search criteria or date range
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    THC ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bhada Chalan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    THC Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LR Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Ops
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Fin
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BTH Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.thc_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {record.thc_id_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.thc_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(record.thc_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.lr_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.vehicle_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.vendor_master?.vendor_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.status_ops?.status_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.status_fin?.status_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(record.thc_gross_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">
                      {formatCurrency(record.thc_balance_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handlePrint(record.thc_id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Print THC"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredRecords.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {filteredRecords.length} THC record{filteredRecords.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {selectedTHC && (
        <THCPrintPreview
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setSelectedTHC(null);
          }}
          thcId={selectedTHC}
        />
      )}
    </div>
  );
}
