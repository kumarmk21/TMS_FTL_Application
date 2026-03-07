import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AddAccountModal from '../components/modals/AddAccountModal';
import EditAccountModal from '../components/modals/EditAccountModal';

interface Account {
  id: string;
  accounting_head: string;
  sub_group: string;
  main_group: string;
  active: boolean;
  created_at: string;
}

export default function AccountsMaster() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [filterMainGroup, setFilterMainGroup] = useState<string>('all');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [searchTerm, accounts, filterMainGroup]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts_master')
        .select('*')
        .order('accounting_head');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      alert('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    let filtered = accounts;

    if (searchTerm) {
      filtered = filtered.filter(
        (account) =>
          account.accounting_head.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.sub_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.main_group.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterMainGroup !== 'all') {
      filtered = filtered.filter((account) => account.main_group === filterMainGroup);
    }

    setFilteredAccounts(filtered);
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const { error } = await supabase.from('accounts_master').delete().eq('id', id);

      if (error) throw error;

      alert('Account deleted successfully');
      fetchAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(error.message || 'Failed to delete account');
    }
  };

  const handleSuccess = () => {
    fetchAccounts();
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedAccount(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Accounts Master</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Account
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterMainGroup}
            onChange={(e) => setFilterMainGroup(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Main Groups</option>
            <option value="Assets">Assets</option>
            <option value="Liabilities">Liabilities</option>
            <option value="Income">Income</option>
            <option value="Expenditure">Expenditure</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accounting Head
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sub Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Main Group
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
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                    No accounts found
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.accounting_head}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.sub_group}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          account.main_group === 'Assets'
                            ? 'bg-blue-100 text-blue-800'
                            : account.main_group === 'Liabilities'
                            ? 'bg-orange-100 text-orange-800'
                            : account.main_group === 'Income'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {account.main_group}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          account.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {account.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(account)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="text-red-600 hover:text-red-900"
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
      </div>

      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showEditModal && selectedAccount && (
        <EditAccountModal
          account={selectedAccount}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAccount(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
