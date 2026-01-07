import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddVehicleTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddVehicleTypeModal({ isOpen, onClose, onSuccess }: AddVehicleTypeModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_type: '',
    vehicle_code: '',
  });

  useEffect(() => {
    if (isOpen) {
      generateNextVehicleCode();
    }
  }, [isOpen]);

  const generateNextVehicleCode = async () => {
    setLoadingCode(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_master')
        .select('vehicle_code')
        .order('vehicle_code', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextCode = 'VEH001';
      if (data && data.length > 0) {
        const lastCode = data[0].vehicle_code;
        const match = lastCode.match(/^VEH(\d+)$/);
        if (match) {
          const lastNumber = parseInt(match[1], 10);
          const nextNumber = lastNumber + 1;
          nextCode = `VEH${String(nextNumber).padStart(3, '0')}`;
        }
      }

      setFormData({ ...formData, vehicle_code: nextCode });
    } catch (error: any) {
      console.error('Error generating vehicle code:', error);
      alert('Failed to generate vehicle code');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('vehicle_master').insert({
        vehicle_type: formData.vehicle_type.toUpperCase(),
        vehicle_code: formData.vehicle_code.toUpperCase(),
        is_active: true,
      });

      if (error) throw error;

      alert('Vehicle type added successfully!');
      setFormData({
        vehicle_type: '',
        vehicle_code: '',
      });
      onSuccess();
      onClose();
      generateNextVehicleCode();
    } catch (error: any) {
      console.error('Error adding vehicle type:', error);
      alert(error.message || 'Failed to add vehicle type');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add New Vehicle Type</h2>
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
              Vehicle Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.vehicle_code}
              disabled
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed uppercase font-medium"
            />
            <p className="text-xs text-gray-500 mt-1">
              {loadingCode ? 'Generating code...' : 'Auto-generated code (continuation of last entry)'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.vehicle_type}
              onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              required
              placeholder="e.g., 17 FT OPEN"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
            />
            <p className="text-xs text-gray-500 mt-1">Description of the vehicle type</p>
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
              disabled={loading || loadingCode}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : loadingCode ? 'Generating Code...' : 'Add Vehicle Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
