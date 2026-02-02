import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Search, DollarSign } from 'lucide-react';
import AddCustomerRateModal from '../components/modals/AddCustomerRateModal';
import EditCustomerRateModal from '../components/modals/EditCustomerRateModal';

interface CustomerRate {
  rate_id: string;
  customer_id: string | null;
  customer_master_id: string | null;
  customer_name: string | null;
  is_active: boolean;
  sac_code: string | null;
  sac_description: string | null;
  from_city: string | null;
  from_city_id: string | null;
  to_city: string | null;
  to_city_id: string | null;
  vehicle_type: string | null;
  vehicle_type_id: string | null;
  service_type: string | null;
  service_type_rate: number;
  gst_charge_type: string | null;
  gst_percentage: number;
  effective_from: string | null;
  effective_to: string | null;
  remarks: string | null;
  created_by: string | null;
  created_date: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export default function CustomerRateMaster() {
  const [customerRates, setCustomerRates] = useState<CustomerRate[]>([]);
  const [filteredRates, setFilteredRates] = useState<CustomerRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRate, setSelectedRate] = useState<CustomerRate | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchUserRole();
    fetchCustomerRates();
  }, []);

  useEffect(() => {
    filterRates();
  }, [searchTerm, customerRates]);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }
    }
  };

  const fetchCustomerRates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_rate_master')
        .select('*')
        .order('customer_name', { ascending: true });

      if (error) throw error;
      setCustomerRates(data || []);
    } catch (error) {
      console.error('Error fetching customer rates:', error);
      alert('Error loading customer rates');
    } finally {
      setLoading(false);
    }
  };

  const filterRates = () => {
    if (!searchTerm.trim()) {
      setFilteredRates(customerRates);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = customerRates.filter(
      (rate) =>
        rate.customer_name?.toLowerCase().includes(term) ||
        rate.customer_id?.toLowerCase().includes(term) ||
        rate.from_city?.toLowerCase().includes(term) ||
        rate.to_city?.toLowerCase().includes(term) ||
        rate.vehicle_type?.toLowerCase().includes(term) ||
        rate.service_type?.toLowerCase().includes(term)
    );
    setFilteredRates(filtered);
  };

  const handleEdit = (rate: CustomerRate) => {
    setSelectedRate(rate);
    setShowEditModal(true);
  };

  const handleDelete = async (rateId: string) => {
    if (!window.confirm('Are you sure you want to delete this customer rate?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_rate_master')
        .delete()
        .eq('rate_id', rateId);

      if (error) throw error;

      alert('Customer rate deleted successfully');
      fetchCustomerRates();
    } catch (error: any) {
      console.error('Error deleting customer rate:', error);
      alert(error.message || 'Error deleting customer rate');
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Customer Rate Master</h1>
              <p className="text-sm text-gray-600">Manage Customer Service Rates</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Customer Rate
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, city, vehicle type, or service type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GST
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No customer rates found
                  </td>
                </tr>
              ) : (
                filteredRates.map((rate) => (
                  <tr key={rate.rate_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {rate.customer_name || '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {rate.customer_id || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {rate.from_city} → {rate.to_city}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {rate.vehicle_type || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {rate.service_type || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{rate.service_type_rate?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {rate.gst_charge_type || '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {rate.gst_percentage}%
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {rate.effective_from && rate.effective_to ? (
                        <div>
                          <div>{new Date(rate.effective_from).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            to {new Date(rate.effective_to).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          rate.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {rate.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(rate)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(rate.rate_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredRates.length} of {customerRates.length} rates
        </div>
      </div>

      {showAddModal && (
        <AddCustomerRateModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCustomerRates();
          }}
        />
      )}

      {showEditModal && selectedRate && (
        <EditCustomerRateModal
          rate={selectedRate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRate(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedRate(null);
            fetchCustomerRates();
          }}
        />
      )}
    </div>
  );
}
