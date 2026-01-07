import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface State {
  id: string;
  state_name: string;
}

interface City {
  id: string;
  city_name: string;
  state_id: string;
  created_at: string;
}

interface EditCityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  city: City;
}

export function EditCityModal({ isOpen, onClose, onSuccess, city }: EditCityModalProps) {
  const [formData, setFormData] = useState({
    city_name: city.city_name,
    state_id: city.state_id,
  });
  const [states, setStates] = useState<State[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStates();
      setFormData({
        city_name: city.city_name,
        state_id: city.state_id,
      });
    }
  }, [isOpen, city]);

  const fetchStates = async () => {
    try {
      const { data, error } = await supabase
        .from('state_master')
        .select('id, state_name')
        .order('state_name', { ascending: true });

      if (error) throw error;
      setStates(data || []);
    } catch (error: any) {
      console.error('Error fetching states:', error);
      alert('Failed to fetch states');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('city_master')
        .update({
          city_name: formData.city_name.trim().toUpperCase(),
          state_id: formData.state_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', city.id);

      if (error) throw error;

      alert('City updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating city:', error);
      alert(error.message || 'Failed to update city');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit City</h2>
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
              City Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.city_name}
              onChange={(e) =>
                setFormData({ ...formData, city_name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter city name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.state_id}
              onChange={(e) =>
                setFormData({ ...formData, state_id: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select State</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.state_name}
                </option>
              ))}
            </select>
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
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
            >
              {submitting ? 'Updating...' : 'Update City'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
