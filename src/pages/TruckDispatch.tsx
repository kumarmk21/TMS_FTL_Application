import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, FileText, Search, Loader2 } from 'lucide-react';
import { ViewLRModal } from '../components/modals/ViewLRModal';
import { GenerateTHCModal } from '../components/modals/GenerateTHCModal';

interface LRRecord {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  from_city: string;
  to_city: string;
  billing_party_name: string;
  vehicle_number: string;
  vehicle_type: string;
  pay_basis: string;
}

export function TruckDispatch() {
  const [lrRecords, setLrRecords] = useState<LRRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<LRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLR, setSelectedLR] = useState<LRRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  useEffect(() => {
    fetchLRRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, lrRecords]);

  const fetchLRRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_lr')
        .select('tran_id, manual_lr_no, lr_date, from_city, to_city, billing_party_name, vehicle_number, vehicle_type, pay_basis, thc_no')
        .is('thc_no', null)
        .eq('pay_basis', 'TBB')
        .order('lr_date', { ascending: false });

      if (error) throw error;
      setLrRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching LR records:', error);
      alert(error.message || 'Failed to fetch LR records');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    if (!searchTerm.trim()) {
      setFilteredRecords(lrRecords);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = lrRecords.filter(
      (record) =>
        record.manual_lr_no?.toLowerCase().includes(term) ||
        record.billing_party_name?.toLowerCase().includes(term) ||
        record.vehicle_number?.toLowerCase().includes(term) ||
        record.from_city?.toLowerCase().includes(term) ||
        record.to_city?.toLowerCase().includes(term)
    );
    setFilteredRecords(filtered);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Truck Dispatch</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and generate THC for pending LRs
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by LR Number, Billing Party, Vehicle Number, Origin, or Destination..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
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
              {searchTerm ? 'No LR records found matching your search' : 'No pending LRs for truck dispatch'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.tran_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {record.manual_lr_no}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.lr_date ? new Date(record.lr_date).toLocaleDateString('en-IN') : '-'}
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewLR(record)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View LR"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleGenerateTHC(record)}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          title="Generate THC"
                        >
                          Generate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
