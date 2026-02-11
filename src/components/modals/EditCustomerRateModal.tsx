import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

interface CustomerRate {
  rate_id: string;
  customer_id: string | null;
  customer_master_id: string | null;
  customer_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
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
}

interface EditCustomerRateModalProps {
  rate: CustomerRate;
  onClose: () => void;
  onSuccess: () => void;
}

interface Customer {
  id: string;
  customer_id: string;
  customer_name: string;
}

interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
}

interface City {
  id: string;
  city_name: string;
}

interface VehicleType {
  id: string;
  vehicle_type: string;
}

interface SACCode {
  sac_id: string;
  sac_code: string;
  sac_description: string;
}

export default function EditCustomerRateModal({
  rate,
  onClose,
  onSuccess,
}: EditCustomerRateModalProps) {
  const [formData, setFormData] = useState({
    customer_master_id: rate.customer_master_id || '',
    customer_id: rate.customer_id || '',
    customer_name: rate.customer_name || '',
    branch_id: rate.branch_id || '',
    branch_name: rate.branch_name || '',
    sac_id: '',
    sac_code: rate.sac_code || '',
    sac_description: rate.sac_description || '',
    from_city_id: rate.from_city_id || '',
    from_city: rate.from_city || '',
    to_city_id: rate.to_city_id || '',
    to_city: rate.to_city || '',
    vehicle_type_id: rate.vehicle_type_id || '',
    vehicle_type: rate.vehicle_type || '',
    service_type: rate.service_type || '',
    service_type_rate: rate.service_type_rate?.toString() || '',
    gst_charge_type: rate.gst_charge_type || 'IGST',
    gst_percentage: rate.gst_percentage?.toString() || '18',
    effective_from: rate.effective_from || '',
    effective_to: rate.effective_to || '',
    remarks: rate.remarks || '',
    is_active: rate.is_active,
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [sacCodes, setSacCodes] = useState<SACCode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchBranches();
    fetchCities();
    fetchVehicleTypes();
    fetchSACCodes();
  }, []);

  useEffect(() => {
    if (sacCodes.length > 0 && rate.sac_code) {
      const sac = sacCodes.find((s) => s.sac_code === rate.sac_code);
      if (sac) {
        setFormData((prev) => ({ ...prev, sac_id: sac.sac_id }));
      }
    }
  }, [sacCodes, rate.sac_code]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_master')
        .select('id, customer_id, customer_name')
        .eq('is_active', true)
        .order('customer_name');

      if (error) {
        console.error('Error fetching customers:', error);
        alert('Error loading customers: ' + error.message);
        return;
      }

      if (data) {
        console.log('Loaded customers:', data.length);
        setCustomers(data);
      }
    } catch (err) {
      console.error('Exception fetching customers:', err);
    }
  };

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from('branch_master')
      .select('id, branch_code, branch_name')
      .eq('is_active', true)
      .order('branch_name');

    if (!error && data) {
      setBranches(data);
    }
  };

  const fetchCities = async () => {
    const { data, error } = await supabase
      .from('city_master')
      .select('id, city_name')
      .order('city_name');

    if (!error && data) {
      setCities(data);
    }
  };

  const fetchVehicleTypes = async () => {
    const { data, error } = await supabase
      .from('vehicle_master')
      .select('id, vehicle_type')
      .eq('is_active', true)
      .order('vehicle_type');

    if (!error && data) {
      setVehicleTypes(data);
    }
  };

  const fetchSACCodes = async () => {
    const { data, error } = await supabase
      .from('sac_code_master')
      .select('sac_id, sac_code, sac_description')
      .eq('is_active', true)
      .order('sac_code');

    if (!error && data) {
      setSacCodes(data);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    if (!customerId) {
      setFormData({
        ...formData,
        customer_master_id: '',
        customer_id: '',
        customer_name: '',
      });
      return;
    }

    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      console.log('Selected customer:', customer);
      setFormData({
        ...formData,
        customer_master_id: customerId,
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
      });
    } else {
      console.warn('Customer not found:', customerId);
    }
  };

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    if (branch) {
      setFormData({
        ...formData,
        branch_id: branchId,
        branch_name: branch.branch_name,
      });
    }
  };

  const handleFromCityChange = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    if (city) {
      setFormData({
        ...formData,
        from_city_id: cityId,
        from_city: city.city_name,
      });
    }
  };

  const handleToCityChange = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    if (city) {
      setFormData({
        ...formData,
        to_city_id: cityId,
        to_city: city.city_name,
      });
    }
  };

  const handleVehicleTypeChange = (vehicleTypeId: string) => {
    const vehicleType = vehicleTypes.find((v) => v.id === vehicleTypeId);
    if (vehicleType) {
      setFormData({
        ...formData,
        vehicle_type_id: vehicleTypeId,
        vehicle_type: vehicleType.vehicle_type,
      });
    }
  };

  const handleSACCodeChange = (sacId: string) => {
    const sac = sacCodes.find((s) => s.sac_id === sacId);
    if (sac) {
      setFormData({
        ...formData,
        sac_id: sacId,
        sac_code: sac.sac_code,
        sac_description: sac.sac_description,
      });
    } else {
      setFormData({
        ...formData,
        sac_id: '',
        sac_code: '',
        sac_description: '',
      });
    }
  };

  const handleGSTChargeTypeChange = (chargeType: string) => {
    let percentage = '18';
    if (chargeType === 'CGST+SGST') {
      percentage = '9';
    } else if (chargeType === 'Out of GST Scope') {
      percentage = '0';
    }
    setFormData({
      ...formData,
      gst_charge_type: chargeType,
      gst_percentage: percentage,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('customer_rate_master')
        .update({
          customer_master_id: formData.customer_master_id || null,
          customer_id: formData.customer_id || null,
          customer_name: formData.customer_name || null,
          branch_id: formData.branch_id || null,
          branch_name: formData.branch_name || null,
          sac_code: formData.sac_code || null,
          sac_description: formData.sac_description || null,
          from_city_id: formData.from_city_id || null,
          from_city: formData.from_city || null,
          to_city_id: formData.to_city_id || null,
          to_city: formData.to_city || null,
          vehicle_type_id: formData.vehicle_type_id || null,
          vehicle_type: formData.vehicle_type || null,
          service_type: formData.service_type || null,
          service_type_rate: parseFloat(formData.service_type_rate) || 0,
          gst_charge_type: formData.gst_charge_type || null,
          gst_percentage: parseFloat(formData.gst_percentage) || 0,
          effective_from: formData.effective_from || null,
          effective_to: formData.effective_to || null,
          remarks: formData.remarks || null,
          is_active: formData.is_active,
        })
        .eq('rate_id', rate.rate_id);

      if (error) throw error;

      alert('Customer rate updated successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating customer rate:', error);
      alert(error.message || 'Error updating customer rate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Edit Customer Rate</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.customer_master_id}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_id} - {customer.customer_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <select
                value={formData.branch_id}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_code} - {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SAC Code
              </label>
              <select
                value={formData.sac_id}
                onChange={(e) => handleSACCodeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select SAC Code</option>
                {sacCodes.map((sac) => (
                  <option key={sac.sac_id} value={sac.sac_id}>
                    {sac.sac_code} - {sac.sac_description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From City <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.from_city_id}
                onChange={(e) => handleFromCityChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select From City</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.city_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To City <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.to_city_id}
                onChange={(e) => handleToCityChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select To City</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.city_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.vehicle_type_id}
                onChange={(e) => handleVehicleTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Vehicle Type</option>
                {vehicleTypes.map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.vehicle_type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Service Type</option>
                <option value="Warehousing Services">Warehousing Services</option>
                <option value="FTL Services">FTL Services</option>
                <option value="Door Delivery Services">Door Delivery Services</option>
                <option value="Loading Unloading">Loading Unloading</option>
                <option value="Express">Express</option>
                <option value="Standard">Standard</option>
                <option value="Economy">Economy</option>
                <option value="Premium">Premium</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.service_type_rate}
                onChange={(e) => setFormData({ ...formData, service_type_rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Charge Type
              </label>
              <select
                value={formData.gst_charge_type}
                onChange={(e) => handleGSTChargeTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="IGST">IGST (18%)</option>
                <option value="CGST+SGST">CGST+SGST (9%)</option>
                <option value="Out of GST Scope">Out of GST Scope (0%)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Percentage
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.gst_percentage}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                placeholder="18.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective From
              </label>
              <input
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective To
              </label>
              <input
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes or remarks"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Updating...' : 'Update Customer Rate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
