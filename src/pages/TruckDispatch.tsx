import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Eye,
  FileText,
  Search,
  Loader2,
  Filter,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  XCircle,
  Circle,
  ExternalLink,
} from 'lucide-react';
import { ViewLRModal } from '../components/modals/ViewLRModal';
import { GenerateTHCModal } from '../components/modals/GenerateTHCModal';
import { THCPrintPreview } from '../components/THCPrintPreview';
import {
  PushToZohoConfirmModal,
  type PushToZohoItem,
} from '../components/modals/PushToZohoConfirmModal';
import type {
  LRRecord,
  VendorOption,
  THCFilterState,
  ZohoSyncStatus,
} from '../types/thc';

type ViewMode = 'pending' | 'prepared';

interface THCJoin {
  thc_id: string;
  thc_number: string;
  thc_id_number: string;
  thc_gross_amount: number;
  zoho_sync_status: ZohoSyncStatus;
  vendor_master: { vendor_name: string } | null;
}

export function TruckDispatch() {
  const [lrRecords, setLrRecords] = useState<LRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('pending');
  const [filters, setFilters] = useState<THCFilterState>({
    fromDate: '',
    toDate: '',
    vendorId: '',
    lrNumber: '',
    thcNumber: '',
  });
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [selectedLR, setSelectedLR] = useState<LRRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedTHCId, setSelectedTHCId] = useState<string | null>(null);
  const [isTHCPrintOpen, setIsTHCPrintOpen] = useState(false);
  const [selectedTHCIds, setSelectedTHCIds] = useState<Set<string>>(new Set());
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [pushItems, setPushItems] = useState<PushToZohoItem[]>([]);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchLRRecords();
  }, [viewMode, filters]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_master')
        .select('id, vendor_name, vendor_code')
        .eq('is_active', true)
        .order('vendor_name', { ascending: true });
      if (error) throw error;
      setVendors(data || []);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchLRRecords = async () => {
    try {
      setLoading(true);
      setSelectedTHCIds(new Set());

      let query = supabase.from('booking_lr').select(`
        tran_id, manual_lr_no, lr_date, from_city, to_city,
        billing_party_name, vehicle_number, vehicle_type, pay_basis, thc_no,
        thc_details:thc_details (
          thc_id, thc_number, thc_id_number, thc_gross_amount, zoho_sync_status,
          vendor_master:thc_vendor ( vendor_name )
        )
      `);

      query = query.eq('pay_basis', 'TBB');

      if (viewMode === 'pending') {
        query = query.is('thc_no', null);
      } else {
        query = query.not('thc_no', 'is', null);
      }

      if (filters.fromDate) {
        query = query.gte('lr_date', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('lr_date', filters.toDate);
      }
      if (filters.lrNumber) {
        query = query.ilike('manual_lr_no', `%${filters.lrNumber}%`);
      }
      if (viewMode === 'prepared' && filters.thcNumber) {
        query = query.ilike('thc_no', `%${filters.thcNumber}%`);
      }

      query = query.order('lr_date', { ascending: false }).limit(200);

      const { data, error } = await query;
      if (error) throw error;

      let records: LRRecord[] = (data || []).map((row: any) => {
        const thcJoin: THCJoin | null =
          row.thc_details && row.thc_details.length > 0
            ? row.thc_details[0]
            : null;
        return {
          tran_id: row.tran_id,
          manual_lr_no: row.manual_lr_no,
          lr_date: row.lr_date,
          from_city: row.from_city,
          to_city: row.to_city,
          billing_party_name: row.billing_party_name,
          vehicle_number: row.vehicle_number,
          vehicle_type: row.vehicle_type,
          pay_basis: row.pay_basis,
          thc_no: row.thc_no,
          thc_id: thcJoin?.thc_id || null,
          zoho_sync_status: thcJoin?.zoho_sync_status || 'not_synced',
          vendor_name: thcJoin?.vendor_master?.vendor_name || null,
        };
      });

      if (viewMode === 'prepared' && filters.vendorId) {
        const { data: vendorTHCs } = await supabase
          .from('thc_details')
          .select('tran_id')
          .eq('thc_vendor', filters.vendorId);
        const tranIdSet = new Set((vendorTHCs || []).map((t: any) => t.tran_id));
        records = records.filter((r) => tranIdSet.has(r.tran_id));
      }

      setLrRecords(records);
    } catch (error: any) {
      console.error('Error fetching LR records:', error);
      alert(error.message || 'Failed to fetch LR records');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchLRRecords();
  };

  const handleReset = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      vendorId: '',
      lrNumber: '',
      thcNumber: '',
    });
  };

  const handleViewLR = (lr: LRRecord) => {
    setSelectedLR(lr);
    setIsViewModalOpen(true);
  };

  const handleGenerateTHC = (lr: LRRecord) => {
    setSelectedLR(lr);
    setIsGenerateModalOpen(true);
  };

  const handleSuccess = () => {
    fetchLRRecords();
    setIsGenerateModalOpen(false);
  };

  const handleViewTHC = (thcId: string) => {
    setSelectedTHCId(thcId);
    setIsTHCPrintOpen(true);
  };

  const toggleSelectTHC = (thcId: string) => {
    setSelectedTHCIds((prev) => {
      const next = new Set(prev);
      if (next.has(thcId)) {
        next.delete(thcId);
      } else {
        next.add(thcId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTHCIds.size === lrRecords.length) {
      setSelectedTHCIds(new Set());
    } else {
      setSelectedTHCIds(
        new Set(lrRecords.filter((r) => r.thc_id).map((r) => r.thc_id!)),
      );
    }
  };

  const handlePushToZoho = useCallback(async () => {
    if (selectedTHCIds.size === 0) return;
    try {
      const ids = Array.from(selectedTHCIds);
      const { data, error } = await supabase
        .from('thc_details')
        .select(
          'thc_id, thc_number, thc_id_number, thc_gross_amount, vendor_master:thc_vendor (vendor_name)',
        )
        .in('thc_id', ids);

      if (error) throw error;

      const items: PushToZohoItem[] = (data || []).map((row: any) => ({
        thc_id: row.thc_id,
        thc_number: row.thc_number || '',
        thc_id_number: row.thc_id_number || '',
        vendor_name: row.vendor_master?.vendor_name || '',
        thc_gross_amount: row.thc_gross_amount || 0,
      }));

      setPushItems(items);
      setIsPushModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching THC details for push:', error);
      alert(error.message || 'Failed to prepare push');
    }
  }, [selectedTHCIds]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN');
  };

  const getZohoBadge = (status: ZohoSyncStatus | undefined) => {
    switch (status) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Synced
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
            <Circle className="w-3 h-3" />
            Not Synced
          </span>
        );
    }
  };

  const hasActiveFilters =
    filters.fromDate ||
    filters.toDate ||
    filters.vendorId ||
    filters.lrNumber ||
    filters.thcNumber;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Truck Dispatch</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and generate THC for pending and prepared LRs
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            {hasActiveFilters && (
              <span className="text-xs text-gray-400">
                ({[filters.fromDate, filters.toDate, filters.vendorId, filters.lrNumber, filters.thcNumber].filter(Boolean).length} active)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, fromDate: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, toDate: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Vendor
              </label>
              <select
                value={filters.vendorId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, vendorId: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option value="">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                LR Number
              </label>
              <input
                type="text"
                placeholder="Search LR..."
                value={filters.lrNumber}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, lrNumber: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                THC Number
              </label>
              <input
                type="text"
                placeholder="Search THC..."
                value={filters.thcNumber}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, thcNumber: e.target.value }))
                }
                disabled={viewMode === 'pending'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              <button
                onClick={handleReset}
                title="Clear all filters"
                className="px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Pending / Prepared Toggle + Push Action */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('pending')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'pending'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setViewMode('prepared')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'prepared'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Prepared
              </button>
            </div>
            <span className="text-sm text-gray-500">
              {loading
                ? 'Loading...'
                : `${lrRecords.length} ${viewMode === 'pending' ? 'pending' : 'prepared'} LR(s)`}
            </span>
          </div>

          {viewMode === 'prepared' && (
            <div className="flex items-center gap-3">
              {selectedTHCIds.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedTHCIds.size} selected
                </span>
              )}
              <button
                onClick={handlePushToZoho}
                disabled={selectedTHCIds.size === 0}
                title={
                  selectedTHCIds.size === 0
                    ? 'Select THC records to push'
                    : 'Zoho Books Integration coming soon'
                }
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BookOpen className="w-4 h-4" />
                Push to Zoho Books
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        ) : lrRecords.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {hasActiveFilters
                ? `No ${viewMode} LRs found matching your filters`
                : viewMode === 'pending'
                  ? 'No pending LRs for truck dispatch'
                  : 'No prepared THCs found'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {viewMode === 'prepared' && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      <input
                        type="checkbox"
                        checked={
                          lrRecords.length > 0 &&
                          selectedTHCIds.size === lrRecords.filter((r) => r.thc_id).length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LR Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LR Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billing Party
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    THC Number
                  </th>
                  {viewMode === 'prepared' && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zoho Status
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lrRecords.map((record) => (
                  <tr key={record.tran_id} className="hover:bg-gray-50">
                    {viewMode === 'prepared' && (
                      <td className="px-4 py-3">
                        {record.thc_id && (
                          <input
                            type="checkbox"
                            checked={selectedTHCIds.has(record.thc_id)}
                            onChange={() => toggleSelectTHC(record.thc_id!)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {record.manual_lr_no}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(record.lr_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.from_city || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.to_city || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.billing_party_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.vehicle_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.vehicle_type || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.thc_no ? (
                        <button
                          onClick={() => record.thc_id && handleViewTHC(record.thc_id)}
                          className="text-red-600 hover:text-red-700 hover:underline font-medium flex items-center gap-1"
                        >
                          {record.thc_no}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {viewMode === 'prepared' && (
                      <td className="px-4 py-3 text-sm">
                        {getZohoBadge(record.zoho_sync_status)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewLR(record)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View LR"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {viewMode === 'pending' && (
                          <button
                            onClick={() => handleGenerateTHC(record)}
                            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            title="Generate THC"
                          >
                            Generate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && lrRecords.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {lrRecords.length} {viewMode === 'pending' ? 'pending' : 'prepared'} LR record{lrRecords.length !== 1 ? 's' : ''}
              {viewMode === 'prepared' && selectedTHCIds.size > 0 && (
                <span className="ml-2 text-blue-600">• {selectedTHCIds.size} THC(s) selected for Zoho push</span>
              )}
            </p>
          </div>
        )}
      </div>

      {selectedLR && (
        <>
          <ViewLRModal
            isOpen={isViewModalOpen}
            onClose={() => setIsViewModalOpen(false)}
            tranId={selectedLR.tran_id}
          />
          <GenerateTHCModal
            isOpen={isGenerateModalOpen}
            onClose={() => setIsGenerateModalOpen(false)}
            onSuccess={handleSuccess}
            lrRecord={selectedLR}
          />
        </>
      )}

      {selectedTHCId && (
        <THCPrintPreview
          isOpen={isTHCPrintOpen}
          onClose={() => {
            setIsTHCPrintOpen(false);
            setSelectedTHCId(null);
          }}
          thcId={selectedTHCId}
        />
      )}

      <PushToZohoConfirmModal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        selectedItems={pushItems}
      />
    </div>
  );
}
