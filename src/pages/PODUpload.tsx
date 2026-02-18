import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import UpdatePODModal from '../components/modals/UpdatePODModal';

interface PODRecord {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  billing_party_name: string;
  from_city: string;
  to_city: string;
  est_del_date: string | null;
  act_del_date: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
}

export default function PODUpload() {
  const [records, setRecords] = useState<PODRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PODRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PODRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  useEffect(() => {
    fetchPODRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, records]);

  const fetchPODRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_lr')
        .select('tran_id, manual_lr_no, lr_date, billing_party_name, from_city, to_city, est_del_date, act_del_date, vehicle_type, vehicle_number')
        .not('manual_lr_no', 'is', null)
        .is('pod_recd_date', null)
        .order('lr_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
      setFilteredRecords(data || []);
    } catch (error) {
      console.error('Error fetching POD records:', error);
      alert('Error loading records');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    if (!searchTerm.trim()) {
      setFilteredRecords(records);
      setCurrentPage(1);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = records.filter(
      (record) =>
        record.manual_lr_no?.toLowerCase().includes(term) ||
        record.billing_party_name?.toLowerCase().includes(term) ||
        record.from_city?.toLowerCase().includes(term) ||
        record.to_city?.toLowerCase().includes(term)
    );
    setFilteredRecords(filtered);
    setCurrentPage(1);
  };

  const handleUpdateClick = (record: PODRecord) => {
    setSelectedRecord(record);
    setShowUpdateModal(true);
  };

  const handleModalClose = () => {
    setShowUpdateModal(false);
    setSelectedRecord(null);
    fetchPODRecords();
  };

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Upload className="w-6 h-6" />
          Update Hard Copy POD Receipt Module
        </h1>
        <p className="text-slate-600 mt-1">Update POD receipt details for LRs pending confirmation</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by LR Number, Billing Party, From City, To City..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No pending POD records found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">LR Number</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">LR Date</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Billing Party</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">From City</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">To City</th>
                    <th className="text-center p-4 text-sm font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedRecords.map((record) => (
                    <tr key={record.tran_id} className="hover:bg-slate-50">
                      <td className="p-4 text-sm text-slate-900 font-medium">{record.manual_lr_no}</td>
                      <td className="p-4 text-sm text-slate-600">
                        {new Date(record.lr_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-4 text-sm text-slate-600">{record.billing_party_name}</td>
                      <td className="p-4 text-sm text-slate-600">{record.from_city || '-'}</td>
                      <td className="p-4 text-sm text-slate-600">{record.to_city || '-'}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleUpdateClick(record)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm"
                        >
                          <Upload className="w-4 h-4" />
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of{' '}
                {filteredRecords.length} records
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 border rounded-lg ${
                      currentPage === page
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showUpdateModal && selectedRecord && (
        <UpdatePODModal
          record={selectedRecord}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
