import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface VehicleType {
  id: string;
  vehicle_type: string;
  vehicle_code: string;
  is_active: boolean;
}

interface EditVehicleTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicleType: VehicleType;
}

export function EditVehicleTypeModal({
  isOpen,
  onClose,
  onSuccess,
  vehicleType,
}: EditVehicleTypeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_type: vehicleType.vehicle_type,
    vehicle_code: vehicleType.vehicle_code,
    is_active: vehicleType.is_active,
  });

  useEffect(() => {
    setFormData({
      vehicle_type: vehicleType.vehicle_type,
      vehicle_code: vehicleType.vehicle_code,
      is_active: vehicleType.is_active,
    });
  }, [vehicleType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('vehicle_master')
        .update({
          vehicle_type: formData.vehicle_type.toUpperCase(),
          vehicle_code: formData.vehicle_code.toUpperCase(),
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicleType.id);

      if (error) throw error;

      alert('Vehicle type updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating vehicle type:', error);
      alert(error.message || 'Failed to update vehicle type');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Vehicle Type</h2>
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
              onChange={(e) => setFormData({ ...formData, vehicle_code: e.target.value })}
              required
              maxLength={20}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
            />
            <p className="text-xs text-gray-500 mt-1">Unique code for the vehicle type</p>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
            />
            <p className="text-xs text-gray-500 mt-1">Description of the vehicle type</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">Inactive vehicle types will be hidden from selections</p>
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
              {loading ? 'Updating...' : 'Update Vehicle Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
