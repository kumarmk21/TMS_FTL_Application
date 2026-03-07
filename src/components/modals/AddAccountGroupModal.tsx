import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Loader2 } from 'lucide-react';

interface AddAccountGroupModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddAccountGroupModal({ onClose, onSuccess }: AddAccountGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    main_group: 'Assets',
    sub_group: '',
    active: true,
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sub_group.trim()) {
      alert('Please enter sub group name');
      return;
    }

    if (!userId) {
      alert('User not authenticated');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('account_group_master')
        .insert([
          {
            main_group: formData.main_group,
            sub_group: formData.sub_group.trim(),
            active: formData.active,
            created_by: userId,
          },
        ]);

      if (error) throw error;

      alert('Account group added successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error adding account group:', error);
      alert(error.message || 'Failed to add account group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Account Group</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Group <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.main_group}
              onChange={(e) => setFormData({ ...formData, main_group: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            >
              <option value="Assets">Assets</option>
              <option value="Liabilities">Liabilities</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sub Group <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.sub_group}
              onChange={(e) => setFormData({ ...formData, sub_group: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter sub group name"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Account Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
