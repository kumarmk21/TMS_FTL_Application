import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddCityModal } from '../components/modals/AddCityModal';
import { EditCityModal } from '../components/modals/EditCityModal';

interface City {
  id: string;
  city_name: string;
  state_id: string;
  created_at: string;
  state_master: {
    state_name: string;
  };
}

export function CityMaster() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('city_master')
        .select('*, state_master(state_name)')
        .order('city_name', { ascending: true });

      if (error) throw error;
      setCities(data || []);
    } catch (error: any) {
      console.error('Error fetching cities:', error);
      alert('Failed to fetch cities');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, cityName: string) => {
    if (!confirm(`Are you sure you want to delete "${cityName}"?`)) return;

    try {
      const { error } = await supabase
        .from('city_master')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('City deleted successfully!');
      fetchCities();
    } catch (error: any) {
      console.error('Error deleting city:', error);
      alert(error.message || 'Failed to delete city');
    }
  };

  const handleEdit = (city: City) => {
    setSelectedCity(city);
    setShowEditModal(true);
  };

  const filteredCities = cities.filter(
    (city) =>
      city.city_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.state_master?.state_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">City Master</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add City
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by city name or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCities.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    No cities found
                  </td>
                </tr>
              ) : (
                filteredCities.map((city) => (
                  <tr key={city.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {city.city_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {city.state_master?.state_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(city)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(city.id, city.city_name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Total Cities: <span className="font-semibold">{filteredCities.length}</span>
          </p>
        </div>
      </div>

      <AddCityModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchCities}
      />

      {selectedCity && (
        <EditCityModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCity(null);
          }}
          onSuccess={fetchCities}
          city={selectedCity}
        />
      )}
    </div>
  );
}
