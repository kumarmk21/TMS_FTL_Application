import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface City {
  id: string;
  city_name: string;
}

interface State {
  id: string;
  state_name: string;
}

export function AddCustomerModal({ isOpen, onClose, onSuccess }: AddCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    group_id: '',
    sales_person: '',
    gstin: '',
    customer_address: '',
    customer_city: '',
    customer_state: '',
    customer_phone: '',
    customer_email: '',
    lr_mail_id: '',
    customer_contact: '',
    contract_type: '',
    credit_days: '',
  });

  useEffect(() => {
    if (isOpen) {
      generateNextCustomerId();
      fetchCities();
      fetchStates();
    }
  }, [isOpen]);

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('city_master')
        .select('id, city_name')
        .order('city_name', { ascending: true });

      if (error) throw error;
      setCities(data || []);
    } catch (error: any) {
      console.error('Error fetching cities:', error);
    }
  };

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
    }
  };

  const generateNextCustomerId = async () => {
    setLoadingCode(true);
    try {
      const { data, error } = await supabase
        .from('customer_master')
        .select('customer_id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextId = 'SH0000001';
      if (data && data.length > 0) {
        const lastId = data[0].customer_id;
        const match = lastId.match(/^SH(\d+)$/);
        if (match) {
          const lastNumber = parseInt(match[1], 10);
          const nextNumber = lastNumber + 1;
          nextId = `SH${String(nextNumber).padStart(7, '0')}`;
        }
      }

      setFormData(prev => ({ ...prev, customer_id: nextId }));
    } catch (error: any) {
      console.error('Error generating customer ID:', error);
      alert('Failed to generate customer ID');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('customer_master').insert({
        customer_id: formData.customer_id,
        customer_name: formData.customer_name.toUpperCase(),
        group_id: formData.group_id || null,
        sales_person: formData.sales_person || null,
        gstin: formData.gstin.toUpperCase() || null,
        customer_address: formData.customer_address || null,
        customer_city: formData.customer_city || null,
        customer_state: formData.customer_state || null,
        customer_phone: formData.customer_phone || null,
        customer_email: formData.customer_email || null,
        lr_mail_id: formData.lr_mail_id || null,
        customer_contact: formData.customer_contact || null,
        contract_type: formData.contract_type || null,
        credit_days: formData.credit_days ? parseInt(formData.credit_days) : null,
        is_active: true,
      });

      if (error) throw error;

      alert('Customer added successfully!');
      setFormData({
        customer_id: '',
        customer_name: '',
        group_id: '',
        sales_person: '',
        gstin: '',
        customer_address: '',
        customer_city: '',
        customer_state: '',
        customer_phone: '',
        customer_email: '',
        lr_mail_id: '',
        customer_contact: '',
        contract_type: '',
        credit_days: '',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding customer:', error);
      alert(error.message || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add New Customer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customer_id}
                disabled
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed uppercase font-medium"
              />
              <p className="text-xs text-gray-500 mt-1">
                {loadingCode ? 'Generating ID...' : 'Auto-generated ID (continuation of last entry)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                required
                placeholder="Enter customer name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group ID
              </label>
              <input
                type="text"
                value={formData.group_id}
                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                placeholder="Enter group ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Person
              </label>
              <input
                type="text"
                value={formData.sales_person}
                onChange={(e) => setFormData({ ...formData, sales_person: e.target.value })}
                placeholder="Enter sales person name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GSTIN
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="Enter GSTIN"
                maxLength={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                placeholder="Enter phone number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                placeholder="Enter email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LR Mail ID
              </label>
              <input
                type="email"
                value={formData.lr_mail_id}
                onChange={(e) => setFormData({ ...formData, lr_mail_id: e.target.value })}
                placeholder="Enter LR mail ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.customer_contact}
                onChange={(e) => setFormData({ ...formData, customer_contact: e.target.value })}
                placeholder="Enter contact person name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <select
                value={formData.customer_city}
                onChange={(e) => setFormData({ ...formData, customer_city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.city_name}>
                    {city.city_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={formData.customer_state}
                onChange={(e) => setFormData({ ...formData, customer_state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select state</option>
                {states.map((state) => (
                  <option key={state.id} value={state.state_name}>
                    {state.state_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Type
              </label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select contract type</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
                <option value="Per Trip">Per Trip</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit Days
              </label>
              <input
                type="number"
                value={formData.credit_days}
                onChange={(e) => setFormData({ ...formData, credit_days: e.target.value })}
                placeholder="Enter credit days"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={formData.customer_address}
                onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                placeholder="Enter complete address"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6">
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
              {loading ? 'Adding...' : loadingCode ? 'Generating ID...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
