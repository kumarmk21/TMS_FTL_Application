import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, FileText, Loader2, Eye, Download } from 'lucide-react';

interface LRTrackingData {
  manual_lr_no: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  billing_party_name: string;
  est_del_date: string;
  act_del_date: string;
  lr_sla_status: string;
  lr_status: string;
  lr_ops_status: string;
  lr_fin_status: string;
  pod_upload: string;
}

export function LRTracking() {
  const [searchType, setSearchType] = useState<'dateRange' | 'lrNumber'>('dateRange');
  const [statusType, setStatusType] = useState<'lr_status' | 'lr_ops_status' | 'lr_fin_status'>('lr_status');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LRTrackingData[]>([]);

  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    lrNumber: '',
  });

  const [selectedPOD, setSelectedPOD] = useState<string | null>(null);

  const handleSearch = async () => {
    if (searchType === 'dateRange' && (!formData.fromDate || !formData.toDate)) {
      alert('Please select both From Date and To Date');
      return;
    }

    if (searchType === 'lrNumber' && !formData.lrNumber.trim()) {
      alert('Please enter LR Number');
      return;
    }

    try {
      setLoading(true);
      setResults([]);

      let query = supabase
        .from('booking_lr')
        .select('manual_lr_no, from_city, to_city, vehicle_type, billing_party_name, est_del_date, act_del_date, lr_sla_status, lr_status, lr_ops_status, lr_fin_status, pod_upload');

      if (searchType === 'dateRange') {
        query = query
          .gte('lr_date', formData.fromDate)
          .lte('lr_date', formData.toDate);
      } else {
        query = query.ilike('manual_lr_no', `%${formData.lrNumber.trim()}%`);
      }

      const { data, error } = await query.order('manual_lr_no', { ascending: false });

      if (error) throw error;

      setResults(data || []);
    } catch (error: any) {
      console.error('Error searching LR:', error);
      alert(error.message || 'Failed to search LR records');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('dispatch')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('transit')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSLABadgeColor = (status: string) => {
    if (status === 'ON TIME') return 'bg-green-100 text-green-800';
    if (status === 'LATE') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const renderLRStatusView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              LR Number
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              From City
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              To City
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vehicle Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Billing Party
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Est. Delivery
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Act. Delivery
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SLA Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              LR Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              POD
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((lr, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {lr.manual_lr_no}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.from_city}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.to_city}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.vehicle_type || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.billing_party_name || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.est_del_date ? new Date(lr.est_del_date).toLocaleDateString('en-IN') : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.act_del_date ? new Date(lr.act_del_date).toLocaleDateString('en-IN') : '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSLABadgeColor(lr.lr_sla_status)}`}>
                  {lr.lr_sla_status || '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(lr.lr_status)}`}>
                  {lr.lr_status || '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {lr.pod_upload ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPOD(lr.pod_upload)}
                      className="text-blue-600 hover:text-blue-700"
                      title="View POD"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <a
                      href={lr.pod_upload}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700"
                      title="Download POD"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">No POD</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderOpsStatusView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              LR Number
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              From City
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              To City
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vehicle Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Billing Party
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ops Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((lr, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {lr.manual_lr_no}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.from_city}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.to_city}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.vehicle_type || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.billing_party_name || '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(lr.lr_ops_status)}`}>
                  {lr.lr_ops_status || '-'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFinStatusView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              LR Number
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              From City
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              To City
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vehicle Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Billing Party
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fin Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((lr, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {lr.manual_lr_no}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.from_city}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.to_city}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.vehicle_type || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {lr.billing_party_name || '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(lr.lr_fin_status)}`}>
                  {lr.lr_fin_status || '-'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LR Tracking</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track your LR shipments by date range or LR number
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Search By
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="dateRange"
                  checked={searchType === 'dateRange'}
                  onChange={(e) => setSearchType(e.target.value as 'dateRange' | 'lrNumber')}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Date Range</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="lrNumber"
                  checked={searchType === 'lrNumber'}
                  onChange={(e) => setSearchType(e.target.value as 'dateRange' | 'lrNumber')}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">LR Number</span>
              </label>
            </div>
          </div>

          {searchType === 'dateRange' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LR Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.lrNumber}
                  onChange={(e) => setFormData({ ...formData, lrNumber: e.target.value })}
                  placeholder="Enter LR Number"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Status Type
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="lr_status"
                  checked={statusType === 'lr_status'}
                  onChange={(e) => setStatusType(e.target.value as any)}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">LR Status</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="lr_ops_status"
                  checked={statusType === 'lr_ops_status'}
                  onChange={(e) => setStatusType(e.target.value as any)}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">LR Ops Status</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="lr_fin_status"
                  checked={statusType === 'lr_fin_status'}
                  onChange={(e) => setStatusType(e.target.value as any)}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">LR Fin Status</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results ({results.length} records found)
            </h2>
          </div>
          <div className="p-6">
            {statusType === 'lr_status' && renderLRStatusView()}
            {statusType === 'lr_ops_status' && renderOpsStatusView()}
            {statusType === 'lr_fin_status' && renderFinStatusView()}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && (formData.fromDate || formData.lrNumber) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No LR records found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your search criteria</p>
        </div>
      )}

      {selectedPOD && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">POD Document</h3>
              <button
                onClick={() => setSelectedPOD(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6">
              {selectedPOD.endsWith('.pdf') ? (
                <iframe
                  src={selectedPOD}
                  className="w-full h-[600px] border border-gray-200 rounded"
                  title="POD Document"
                />
              ) : (
                <img
                  src={selectedPOD}
                  alt="POD Document"
                  className="w-full h-auto rounded border border-gray-200"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
