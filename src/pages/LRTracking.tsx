import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search, Calendar, FileText, Loader2, Eye, Download,
  MapPin, Truck, User, IndianRupee, ArrowRight, Package
} from 'lucide-react';

interface LRTrackingData {
  manual_lr_no: string;
  lr_date: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  vehicle_number: string;
  billing_party_name: string;
  est_del_date: string;
  act_del_date: string;
  lr_sla_status: string;
  lr_status: string;
  lr_ops_status: string;
  lr_financial_status: string;
  pod_upload: string;
}

interface LROpsDetailData {
  id: string;
  manual_lr_no: string;
  lr_date: string;
  billing_party_name: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  vehicle_number: string;
  lr_ops_status: string;
  thc_amount: number | null;
  thc_advance_amount: number | null;
  thc_balance_amount: number | null;
  ven_act_name: string | null;
}

export function LRTracking() {
  const [searchType, setSearchType] = useState<'dateRange' | 'lrNumber'>('dateRange');
  const [statusType, setStatusType] = useState<'lr_status' | 'lr_ops_status' | 'lr_financial_status'>('lr_status');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LRTrackingData[]>([]);
  const [opsDetailResults, setOpsDetailResults] = useState<LROpsDetailData[]>([]);
  const [searched, setSearched] = useState(false);

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
      setOpsDetailResults([]);
      setSearched(false);

      if (searchType === 'lrNumber' && statusType === 'lr_ops_status') {
        const { data: lrData, error: lrError } = await supabase
          .from('booking_lr')
          .select('id, manual_lr_no, lr_date, billing_party_name, from_city, to_city, vehicle_type, vehicle_number, lr_ops_status')
          .ilike('manual_lr_no', `%${formData.lrNumber.trim()}%`)
          .order('manual_lr_no', { ascending: false });

        if (lrError) throw lrError;

        if (lrData && lrData.length > 0) {
          const lrIds = lrData.map((lr) => lr.id);
          const { data: thcData, error: thcError } = await supabase
            .from('thc_details')
            .select('tran_id, thc_amount, thc_advance_amount, thc_balance_amount, ven_act_name')
            .in('tran_id', lrIds);

          if (thcError) throw thcError;

          const thcMap: Record<string, { thc_amount: number | null; thc_advance_amount: number | null; thc_balance_amount: number | null; ven_act_name: string | null }> = {};
          (thcData || []).forEach((t) => {
            thcMap[t.tran_id] = {
              thc_amount: t.thc_amount,
              thc_advance_amount: t.thc_advance_amount,
              thc_balance_amount: t.thc_balance_amount,
              ven_act_name: t.ven_act_name,
            };
          });

          const combined: LROpsDetailData[] = lrData.map((lr) => ({
            id: lr.id,
            manual_lr_no: lr.manual_lr_no,
            lr_date: lr.lr_date,
            billing_party_name: lr.billing_party_name,
            from_city: lr.from_city,
            to_city: lr.to_city,
            vehicle_type: lr.vehicle_type,
            vehicle_number: lr.vehicle_number,
            lr_ops_status: lr.lr_ops_status,
            ...(thcMap[lr.id] || { thc_amount: null, thc_advance_amount: null, thc_balance_amount: null, ven_act_name: null }),
          }));

          setOpsDetailResults(combined);
        }
        setSearched(true);
        return;
      }

      let query = supabase
        .from('booking_lr')
        .select('manual_lr_no, lr_date, from_city, to_city, vehicle_type, vehicle_number, billing_party_name, est_del_date, act_del_date, lr_sla_status, lr_status, lr_ops_status, lr_financial_status, pod_upload');

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
      setSearched(true);
    } catch (error: any) {
      console.error('Error searching LR:', error);
      alert(error.message || 'Failed to search LR records');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    const s = status.toLowerCase();
    if (s.includes('delivered')) return 'bg-emerald-100 text-emerald-800';
    if (s.includes('dispatch')) return 'bg-blue-100 text-blue-800';
    if (s.includes('pending')) return 'bg-amber-100 text-amber-800';
    if (s.includes('transit')) return 'bg-sky-100 text-sky-800';
    if (s.includes('paid')) return 'bg-emerald-100 text-emerald-800';
    return 'bg-gray-100 text-gray-700';
  };

  const getSLABadgeColor = (status: string) => {
    if (status === 'ON TIME') return 'bg-emerald-100 text-emerald-800';
    if (status === 'LATE') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-700';
  };

  const fmt = (val: number | null) =>
    val != null ? `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';

  const renderOpsDetailView = () => (
    <div className="space-y-6">
      {opsDetailResults.map((lr, index) => (
        <div key={index} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-lg p-2">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-300 font-medium uppercase tracking-wider">LR Number</p>
                <p className="text-lg font-bold text-white">{lr.manual_lr_no || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-300 uppercase tracking-wider">LR Date</p>
                <p className="text-sm font-semibold text-white">
                  {lr.lr_date ? new Date(lr.lr_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </p>
              </div>
              {lr.lr_ops_status && (
                <span className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(lr.lr_ops_status)}`}>
                  {lr.lr_ops_status}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Shipment Details</h3>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-blue-50 rounded-lg p-2">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Billing Party</p>
                  <p className="text-sm font-semibold text-gray-800">{lr.billing_party_name || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-emerald-50 rounded-lg p-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium mb-1">Route</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{lr.from_city || '-'}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800">{lr.to_city || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-amber-50 rounded-lg p-2">
                  <Truck className="w-4 h-4 text-amber-600" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 flex-1">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Vehicle Type</p>
                    <p className="text-sm font-semibold text-gray-800">{lr.vehicle_type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Vehicle Number</p>
                    <p className="text-sm font-semibold text-gray-800 uppercase">{lr.vehicle_number || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">THC Financial Details</h3>

              {lr.ven_act_name && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 bg-slate-50 rounded-lg p-2">
                    <Package className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Vendor Account</p>
                    <p className="text-sm font-semibold text-gray-800">{lr.ven_act_name}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                  <div className="flex items-center justify-center mb-1">
                    <IndianRupee className="w-3.5 h-3.5 text-blue-500 mr-0.5" />
                    <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">THC Amount</p>
                  </div>
                  <p className="text-base font-bold text-blue-800">{fmt(lr.thc_amount)}</p>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                  <div className="flex items-center justify-center mb-1">
                    <IndianRupee className="w-3.5 h-3.5 text-amber-500 mr-0.5" />
                    <p className="text-xs font-medium text-amber-500 uppercase tracking-wide">Advance</p>
                  </div>
                  <p className="text-base font-bold text-amber-800">{fmt(lr.thc_advance_amount)}</p>
                </div>

                <div className={`rounded-xl p-4 text-center border ${(lr.thc_balance_amount ?? 0) > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex items-center justify-center mb-1">
                    <IndianRupee className={`w-3.5 h-3.5 mr-0.5 ${(lr.thc_balance_amount ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                    <p className={`text-xs font-medium uppercase tracking-wide ${(lr.thc_balance_amount ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Balance</p>
                  </div>
                  <p className={`text-base font-bold ${(lr.thc_balance_amount ?? 0) > 0 ? 'text-red-800' : 'text-emerald-800'}`}>{fmt(lr.thc_balance_amount)}</p>
                </div>
              </div>

              {lr.thc_amount == null && lr.thc_advance_amount == null && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Package className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500">No THC record linked to this LR</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderLRStatusView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Number</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Party</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Delivery</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Act. Delivery</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POD</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((lr, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{lr.manual_lr_no}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{lr.lr_date ? new Date(lr.lr_date).toLocaleDateString('en-IN') : '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.from_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.to_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.vehicle_type || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.billing_party_name || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.est_del_date ? new Date(lr.est_del_date).toLocaleDateString('en-IN') : '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.act_del_date ? new Date(lr.act_del_date).toLocaleDateString('en-IN') : '-'}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSLABadgeColor(lr.lr_sla_status)}`}>{lr.lr_sla_status || '-'}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(lr.lr_status)}`}>{lr.lr_status || '-'}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                {lr.pod_upload ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedPOD(lr.pod_upload)} className="text-blue-600 hover:text-blue-700" title="View POD">
                      <Eye className="w-5 h-5" />
                    </button>
                    <a href={lr.pod_upload} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700" title="Download POD">
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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Number</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Party</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ops Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((lr, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{lr.manual_lr_no}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{lr.lr_date ? new Date(lr.lr_date).toLocaleDateString('en-IN') : '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.from_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.to_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.vehicle_type || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.billing_party_name || '-'}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(lr.lr_ops_status)}`}>{lr.lr_ops_status || '-'}</span>
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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Number</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Party</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((lr, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{lr.manual_lr_no}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{lr.lr_date ? new Date(lr.lr_date).toLocaleDateString('en-IN') : '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.from_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.to_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.vehicle_type || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.billing_party_name || '-'}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(lr.lr_financial_status)}`}>{lr.lr_financial_status || '-'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const isOpsDetailMode = searchType === 'lrNumber' && statusType === 'lr_ops_status';
  const hasResults = isOpsDetailMode ? opsDetailResults.length > 0 : results.length > 0;
  const resultCount = isOpsDetailMode ? opsDetailResults.length : results.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LR Tracking</h1>
          <p className="mt-1 text-sm text-gray-600">Track your LR shipments by date range or LR number</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Search By</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date <span className="text-red-500">*</span></label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date <span className="text-red-500">*</span></label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">LR Number <span className="text-red-500">*</span></label>
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
            <label className="block text-sm font-medium text-gray-700 mb-3">Status Type</label>
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
                  value="lr_financial_status"
                  checked={statusType === 'lr_financial_status'}
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

      {hasResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results
              <span className="ml-2 text-sm font-normal text-gray-500">({resultCount} record{resultCount !== 1 ? 's' : ''} found)</span>
            </h2>
          </div>
          <div className={isOpsDetailMode ? 'p-6' : 'p-6'}>
            {isOpsDetailMode && renderOpsDetailView()}
            {!isOpsDetailMode && statusType === 'lr_status' && renderLRStatusView()}
            {!isOpsDetailMode && statusType === 'lr_ops_status' && renderOpsStatusView()}
            {!isOpsDetailMode && statusType === 'lr_financial_status' && renderFinStatusView()}
          </div>
        </div>
      )}

      {!loading && searched && !hasResults && (
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
              <button onClick={() => setSelectedPOD(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6">
              {selectedPOD.endsWith('.pdf') ? (
                <iframe src={selectedPOD} className="w-full h-[600px] border border-gray-200 rounded" title="POD Document" />
              ) : (
                <img src={selectedPOD} alt="POD Document" className="w-full h-auto rounded border border-gray-200" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
