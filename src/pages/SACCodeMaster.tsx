import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, CreditCard as Edit2, Trash2, Search, FileText } from 'lucide-react';
import AddSACCodeModal from '../components/modals/AddSACCodeModal';
import EditSACCodeModal from '../components/modals/EditSACCodeModal';

interface SACCode {
  sac_id: string;
  sac_code: string;
  sac_description: string;
  gst_rate: number;
  rcm_applicable: boolean;
  is_active: boolean;
  created_at: string;
}

export default function SACCodeMaster() {
  const [sacCodes, setSacCodes] = useState<SACCode[]>([]);
  const [filteredSacCodes, setFilteredSacCodes] = useState<SACCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSacCode, setSelectedSacCode] = useState<SACCode | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchUserRole();
    fetchSacCodes();
  }, []);

  useEffect(() => {
    filterSacCodes();
  }, [searchTerm, sacCodes]);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }
    }
  };

  const fetchSacCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sac_code_master')
        .select('*')
        .order('sac_code', { ascending: true });

      if (error) throw error;
      setSacCodes(data || []);
    } catch (error) {
      console.error('Error fetching SAC codes:', error);
      alert('Error loading SAC codes');
    } finally {
      setLoading(false);
    }
  };

  const filterSacCodes = () => {
    if (!searchTerm.trim()) {
      setFilteredSacCodes(sacCodes);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = sacCodes.filter(
      (sac) =>
        sac.sac_code.toLowerCase().includes(term) ||
        sac.sac_description.toLowerCase().includes(term)
    );
    setFilteredSacCodes(filtered);
  };

  const handleEdit = (sacCode: SACCode) => {
    setSelectedSacCode(sacCode);
    setShowEditModal(true);
  };

  const handleDelete = async (sacId: string) => {
    if (!window.confirm('Are you sure you want to delete this SAC code?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sac_code_master')
        .delete()
        .eq('sac_id', sacId);

      if (error) throw error;

      alert('SAC code deleted successfully');
      fetchSacCodes();
    } catch (error: any) {
      console.error('Error deleting SAC code:', error);
      alert(error.message || 'Error deleting SAC code');
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">SAC Code Master</h1>
              <p className="text-sm text-gray-600">Manage Services Accounting Codes</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add SAC Code
            </button>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by SAC code or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SAC Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GST Rate (%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RCM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSacCodes.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'No SAC codes found matching your search' : 'No SAC codes available'}
                  </td>
                </tr>
              ) : (
                filteredSacCodes.map((sac) => (
                  <tr key={sac.sac_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sac.sac_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {sac.sac_description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sac.gst_rate != null ? `${sac.gst_rate}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          sac.rcm_applicable
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {sac.rcm_applicable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          sac.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {sac.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(sac)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sac.sac_id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredSacCodes.length} of {sacCodes.length} SAC codes
        </div>
      </div>

      <AddSACCodeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchSacCodes}
      />

      {selectedSacCode && (
        <EditSACCodeModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSacCode(null);
          }}
          sacCode={selectedSacCode}
          onSuccess={fetchSacCodes}
        />
      )}
    </div>
  );
}
