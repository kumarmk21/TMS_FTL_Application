import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddVehicleTypeModal } from '../components/modals/AddVehicleTypeModal';
import { EditVehicleTypeModal } from '../components/modals/EditVehicleTypeModal';

interface VehicleType {
  id: string;
  vehicle_type: string;
  vehicle_code: string;
  is_active: boolean;
  created_at: string;
}

export function VehicleTypeMaster() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null);

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const fetchVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_master')
        .select('*')
        .order('vehicle_code', { ascending: true });

      if (error) throw error;
      setVehicleTypes(data || []);
    } catch (error: any) {
      console.error('Error fetching vehicle types:', error);
      alert('Failed to fetch vehicle types');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, vehicleType: string) => {
    if (!confirm(`Are you sure you want to delete "${vehicleType}"?`)) return;

    try {
      const { error } = await supabase
        .from('vehicle_master')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Vehicle type deleted successfully!');
      fetchVehicleTypes();
    } catch (error: any) {
      console.error('Error deleting vehicle type:', error);
      alert(error.message || 'Failed to delete vehicle type');
    }
  };

  const handleEdit = (vehicleType: VehicleType) => {
    setSelectedVehicleType(vehicleType);
    setShowEditModal(true);
  };

  const filteredVehicleTypes = vehicleTypes.filter(
    (vt) =>
      vt.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vt.vehicle_code.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Type Master</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Vehicle Type
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by vehicle type or code..."
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
                  Vehicle Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicleTypes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No vehicle types found
                  </td>
                </tr>
              ) : (
                filteredVehicleTypes.map((vehicleType) => (
                  <tr key={vehicleType.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {vehicleType.vehicle_code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {vehicleType.vehicle_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          vehicleType.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {vehicleType.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(vehicleType)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicleType.id, vehicleType.vehicle_type)}
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
            Total Vehicle Types: <span className="font-semibold">{filteredVehicleTypes.length}</span>
          </p>
        </div>
      </div>

      <AddVehicleTypeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchVehicleTypes}
      />

      {selectedVehicleType && (
        <EditVehicleTypeModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedVehicleType(null);
          }}
          onSuccess={fetchVehicleTypes}
          vehicleType={selectedVehicleType}
        />
      )}
    </div>
  );
}
