import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EditOrderEnquiryModalProps {
  enquiry: {
    id: string;
    enq_id: string;
    loading_date: string;
    customer_id: string;
    origin_id: string;
    destination_id: string;
    vehicle_type_id: string;
    weight_mt: number;
    expected_rate: number | null;
    status: string;
    customer_master: { customer_name: string };
    origin: { city_name: string };
    destination: { city_name: string };
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface Customer {
  id: string;
  customer_id: string;
  customer_name: string;
}

interface City {
  id: string;
  city_name: string;
  state_name: string;
}

interface VehicleType {
  id: string;
  vehicle_type: string;
}

export function EditOrderEnquiryModal({ enquiry, onClose, onSuccess }: EditOrderEnquiryModalProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

  const [customerSearch, setCustomerSearch] = useState(enquiry.customer_master?.customer_name || '');
  const [originSearch, setOriginSearch] = useState(enquiry.origin?.city_name || '');
  const [destinationSearch, setDestinationSearch] = useState(enquiry.destination?.city_name || '');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

  const [formData, setFormData] = useState({
    loading_date: enquiry.loading_date.split('T')[0],
    customer_id: enquiry.customer_id,
    origin_id: enquiry.origin_id,
    destination_id: enquiry.destination_id,
    vehicle_type_id: enquiry.vehicle_type_id,
    weight_mt: enquiry.weight_mt.toString(),
    expected_rate: enquiry.expected_rate?.toString() || '',
    status: enquiry.status,
  });

  useEffect(() => {
    fetchCustomers();
    fetchCities();
    fetchVehicleTypes();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_master')
        .select('id, customer_id, customer_name')
        .eq('is_active', true)
        .order('customer_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('city_master')
        .select('id, city_name, state_master(state_name)')
        .order('city_name');

      if (error) throw error;

      const formattedData = data?.map(city => ({
        id: city.id,
        city_name: city.city_name,
        state_name: (city.state_master as any)?.state_name || '',
      })) || [];

      setCities(formattedData);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_master')
        .select('id, vehicle_type')
        .eq('is_active', true)
        .order('vehicle_type');

      if (error) throw error;
      setVehicleTypes(data || []);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.customer_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.customer_id.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredOrigins = cities.filter((c) =>
    c.city_name.toLowerCase().includes(originSearch.toLowerCase()) ||
    c.state_name.toLowerCase().includes(originSearch.toLowerCase())
  );

  const filteredDestinations = cities.filter((c) =>
    c.city_name.toLowerCase().includes(destinationSearch.toLowerCase()) ||
    c.state_name.toLowerCase().includes(destinationSearch.toLowerCase())
  );

  const handleCustomerSelect = (customer: Customer) => {
    setCustomerSearch(customer.customer_name);
    setFormData({ ...formData, customer_id: customer.id });
    setShowCustomerDropdown(false);
  };

  const handleOriginSelect = (city: City) => {
    setOriginSearch(city.city_name);
    setFormData({ ...formData, origin_id: city.id });
    setShowOriginDropdown(false);
  };

  const handleDestinationSelect = (city: City) => {
    setDestinationSearch(city.city_name);
    setFormData({ ...formData, destination_id: city.id });
    setShowDestinationDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id) {
      alert('Please select a customer');
      return;
    }
    if (!formData.origin_id) {
      alert('Please select an origin');
      return;
    }
    if (!formData.destination_id) {
      alert('Please select a destination');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('order_enquiry')
        .update({
          loading_date: formData.loading_date,
          customer_id: formData.customer_id,
          origin_id: formData.origin_id,
          destination_id: formData.destination_id,
          vehicle_type_id: formData.vehicle_type_id,
          weight_mt: parseFloat(formData.weight_mt),
          expected_rate: formData.expected_rate ? parseFloat(formData.expected_rate) : null,
          status: formData.status,
        })
        .eq('id', enquiry.id);

      if (error) throw error;

      alert('Enquiry updated successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating enquiry:', error);
      alert(error.message || 'Failed to update enquiry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Edit Enquiry: {enquiry.enq_id}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loading Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.loading_date}
                onChange={(e) => setFormData({ ...formData, loading_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (MT) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={formData.weight_mt}
                onChange={(e) => setFormData({ ...formData, weight_mt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter weight in MT"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
                if (e.target.value === '') setFormData({ ...formData, customer_id: '' });
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search customer..."
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                  >
                    <div className="font-medium text-gray-900">{customer.customer_name}</div>
                    <div className="text-sm text-gray-500">{customer.customer_id}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Origin <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={originSearch}
                onChange={(e) => {
                  setOriginSearch(e.target.value);
                  setShowOriginDropdown(true);
                  if (e.target.value === '') setFormData({ ...formData, origin_id: '' });
                }}
                onFocus={() => setShowOriginDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search origin city..."
              />
              {showOriginDropdown && filteredOrigins.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredOrigins.map((city) => (
                    <div
                      key={city.id}
                      onClick={() => handleOriginSelect(city)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                    >
                      <div className="font-medium text-gray-900">{city.city_name}</div>
                      <div className="text-sm text-gray-500">{city.state_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={destinationSearch}
                onChange={(e) => {
                  setDestinationSearch(e.target.value);
                  setShowDestinationDropdown(true);
                  if (e.target.value === '') setFormData({ ...formData, destination_id: '' });
                }}
                onFocus={() => setShowDestinationDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search destination city..."
              />
              {showDestinationDropdown && filteredDestinations.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredDestinations.map((city) => (
                    <div
                      key={city.id}
                      onClick={() => handleDestinationSelect(city)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                    >
                      <div className="font-medium text-gray-900">{city.city_name}</div>
                      <div className="text-sm text-gray-500">{city.state_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.vehicle_type_id}
                onChange={(e) => setFormData({ ...formData, vehicle_type_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select vehicle type</option>
                {vehicleTypes.map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.vehicle_type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Rate
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.expected_rate}
                onChange={(e) => setFormData({ ...formData, expected_rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter expected rate"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {loading ? 'Updating...' : 'Update Enquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
