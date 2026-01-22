import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

interface SACCode {
  sac_id: string;
  sac_code: string;
  sac_description: string;
  is_active: boolean;
}

interface EditSACCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sacCode: SACCode;
  onSuccess: () => void;
}

export default function EditSACCodeModal({ isOpen, onClose, sacCode, onSuccess }: EditSACCodeModalProps) {
  const [formData, setFormData] = useState({
    sac_code: '',
    sac_description: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sacCode) {
      setFormData({
        sac_code: sacCode.sac_code,
        sac_description: sacCode.sac_description,
        is_active: sacCode.is_active,
      });
    }
  }, [sacCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sac_code.trim()) {
      alert('Please enter SAC code');
      return;
    }

    if (!formData.sac_description.trim()) {
      alert('Please enter description');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sac_code_master')
        .update({
          sac_code: formData.sac_code.trim(),
          sac_description: formData.sac_description.trim(),
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('sac_id', sacCode.sac_id);

      if (error) throw error;

      alert('SAC code updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating SAC code:', error);
      alert(error.message || 'Error updating SAC code');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Edit SAC Code</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SAC Code *
              </label>
              <input
                type="text"
                value={formData.sac_code}
                onChange={(e) => setFormData({ ...formData, sac_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter SAC code (e.g., 996511)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.sac_description}
                onChange={(e) => setFormData({ ...formData, sac_description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter SAC description"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Active
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Updating...' : 'Update SAC Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
