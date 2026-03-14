import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

interface AddSACCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSACCodeModal({ isOpen, onClose, onSuccess }: AddSACCodeModalProps) {
  const [formData, setFormData] = useState({
    sac_code: '',
    sac_description: '',
    gst_rate: '',
    rcm_applicable: false,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);

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

    if (formData.gst_rate === '' || formData.gst_rate === null) {
      alert('Please enter GST Rate');
      return;
    }

    const gstRateNum = parseFloat(formData.gst_rate);
    if (isNaN(gstRateNum) || gstRateNum < 0 || gstRateNum > 100) {
      alert('GST Rate must be between 0 and 100');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('sac_code_master')
        .insert([
          {
            sac_code: formData.sac_code.trim(),
            sac_description: formData.sac_description.trim(),
            gst_rate: gstRateNum,
            rcm_applicable: formData.rcm_applicable,
            is_active: formData.is_active,
            created_by: user?.id,
          },
        ]);

      if (error) throw error;

      alert('SAC code added successfully');
      setFormData({
        sac_code: '',
        sac_description: '',
        gst_rate: '',
        rcm_applicable: false,
        is_active: true,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding SAC code:', error);
      alert(error.message || 'Error adding SAC code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      sac_code: '',
      sac_description: '',
      gst_rate: '',
      rcm_applicable: false,
      is_active: true,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Add SAC Code</h2>
          <button
            onClick={handleClose}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Rate (%) *
              </label>
              <input
                type="number"
                value={formData.gst_rate}
                onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 18"
                min="0"
                max="100"
                step="0.01"
                required
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rcm_applicable"
                  checked={formData.rcm_applicable}
                  onChange={(e) => setFormData({ ...formData, rcm_applicable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="rcm_applicable" className="ml-2 text-sm text-gray-700">
                  RCM Applicable
                </label>
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
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Adding...' : 'Add SAC Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
