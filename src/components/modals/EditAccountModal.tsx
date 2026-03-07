import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EditAccountModalProps {
  account: {
    id: string;
    accounting_head: string;
    sub_group: string;
    main_group: string;
    active: boolean;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface AccountGroup {
  id: string;
  main_group: string;
  sub_group: string;
}

export default function EditAccountModal({
  account,
  onClose,
  onSuccess,
}: EditAccountModalProps) {
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [formData, setFormData] = useState({
    accounting_head: account.accounting_head,
    sub_group: account.sub_group,
    main_group: account.main_group,
    active: account.active,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccountGroups();
  }, []);

  const fetchAccountGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('account_group_master')
        .select('id, main_group, sub_group')
        .eq('active', true)
        .order('main_group')
        .order('sub_group');

      if (error) throw error;
      setAccountGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching account groups:', error);
      alert('Failed to load account groups');
    }
  };

  const handleSubGroupChange = (subGroup: string) => {
    const selectedGroup = accountGroups.find((g) => g.sub_group === subGroup);
    setFormData({
      ...formData,
      sub_group: subGroup,
      main_group: selectedGroup?.main_group || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const { error } = await supabase
        .from('accounts_master')
        .update({
          accounting_head: formData.accounting_head.trim(),
          sub_group: formData.sub_group,
          main_group: formData.main_group,
          active: formData.active,
        })
        .eq('id', account.id);

      if (error) throw error;

      alert('Account updated successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating account:', error);
      alert(error.message || 'Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  const uniqueSubGroups = Array.from(new Set(accountGroups.map((g) => g.sub_group))).sort();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Account</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Accounting Head <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.accounting_head}
              onChange={(e) =>
                setFormData({ ...formData, accounting_head: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sub Group <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.sub_group}
              onChange={(e) => handleSubGroupChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            >
              <option value="">Select Sub Group</option>
              {uniqueSubGroups.map((subGroup) => (
                <option key={subGroup} value={subGroup}>
                  {subGroup}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Group
            </label>
            <input
              type="text"
              value={formData.main_group}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
              placeholder="Auto-populated from Sub Group"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) =>
                setFormData({ ...formData, active: e.target.checked })
              }
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="active" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
