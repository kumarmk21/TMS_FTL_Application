import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, Search } from 'lucide-react';
import { AddAccountGroupModal } from '../components/modals/AddAccountGroupModal';
import { EditAccountGroupModal } from '../components/modals/EditAccountGroupModal';

interface AccountGroup {
  id: string;
  main_group: string;
  sub_group: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export default function AccountGroupMaster() {
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccountGroup, setSelectedAccountGroup] = useState<AccountGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAccountGroups();
  }, []);

  const fetchAccountGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_group_master')
        .select('*')
        .order('main_group', { ascending: true })
        .order('sub_group', { ascending: true });

      if (error) throw error;
      setAccountGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching account groups:', error);
      alert(error.message || 'Failed to fetch account groups');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (accountGroup: AccountGroup) => {
    setSelectedAccountGroup(accountGroup);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account group?')) return;

    try {
      const { error } = await supabase
        .from('account_group_master')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Account group deleted successfully');
      fetchAccountGroups();
    } catch (error: any) {
      console.error('Error deleting account group:', error);
      alert(error.message || 'Failed to delete account group');
    }
  };

  const filteredAccountGroups = accountGroups.filter(group =>
    group.sub_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.main_group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Group Master</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage account group categories
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Account Group
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by main group or sub group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Main Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sub Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto" />
                  </td>
                </tr>
              ) : filteredAccountGroups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No account groups found matching your search' : 'No account groups found'}
                  </td>
                </tr>
              ) : (
                filteredAccountGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{group.main_group}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{group.sub_group}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          group.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {group.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleEdit(group)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddAccountGroupModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchAccountGroups();
          }}
        />
      )}

      {showEditModal && selectedAccountGroup && (
        <EditAccountGroupModal
          accountGroup={selectedAccountGroup}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAccountGroup(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedAccountGroup(null);
            fetchAccountGroups();
          }}
        />
      )}
    </div>
  );
}
