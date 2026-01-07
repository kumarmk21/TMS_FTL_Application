import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Branch } from '../../lib/database.types';

interface EditBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branch: Branch | null;
}

export function EditBranchModal({ isOpen, onClose, onSuccess, branch }: EditBranchModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    is_active: true,
  });

  useEffect(() => {
    if (branch) {
      setFormData({
        branch_name: branch.branch_name,
        branch_code: branch.branch_code || '',
        is_active: branch.is_active,
      });
    }
  }, [branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('branch_master')
        .update({
          branch_name: formData.branch_name.toUpperCase(),
          branch_code: formData.branch_code.toUpperCase() || null,
          is_active: formData.is_active,
        })
        .eq('id', branch.id);

      if (error) throw error;

      alert('Branch updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating branch:', error);
      alert(error.message || 'Failed to update branch');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !branch) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Branch</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.branch_name}
              onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch Code
            </label>
            <input
              type="text"
              value={formData.branch_code}
              onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
              maxLength={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active Branch
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
