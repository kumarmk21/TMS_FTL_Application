import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddCustomerGSTModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Customer {
  customer_id: string;
  customer_name: string;
}

interface State {
  id: string;
  state_name: string;
  state_code: string | null;
  alpha_code: string | null;
}

export function AddCustomerGSTModal({ onClose, onSuccess }: AddCustomerGSTModalProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [formData, setFormData] = useState({
    customer_code: '',
    customer_name: '',
    gstin: '',
    bill_to_address: '',
    state_id: '',
    state_code: '',
    alpha_code: '',
  });

  useEffect(() => {
    fetchCustomers();
    fetchStates();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_master')
        .select('customer_id, customer_name')
        .eq('is_active', true)
        .order('customer_id', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      alert('Failed to fetch customers');
    }
  };

  const fetchStates = async () => {
    try {
      const { data, error } = await supabase
        .from('state_master')
        .select('id, state_name, state_code, alpha_code')
        .order('state_name', { ascending: true });

      if (error) throw error;
      setStates(data || []);
    } catch (error: any) {
      console.error('Error fetching states:', error);
      alert('Failed to fetch states');
    }
  };

  const handleCustomerChange = (customerCode: string) => {
    const selectedCustomer = customers.find((c) => c.customer_id === customerCode);
    setFormData({
      ...formData,
      customer_code: customerCode,
      customer_name: selectedCustomer?.customer_name || '',
    });
  };

  const handleStateChange = (stateId: string) => {
    const selectedState = states.find((s) => s.id === stateId);
    setFormData({
      ...formData,
      state_id: stateId,
      state_code: selectedState?.state_code || '',
      alpha_code: selectedState?.alpha_code || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_code) {
      alert('Please select a customer');
      return;
    }

    if (!formData.bill_to_address.trim()) {
      alert('Please enter bill to address');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('customer_gst_master').insert({
        customer_code: formData.customer_code,
        customer_name: formData.customer_name,
        gstin: formData.gstin.trim().toUpperCase() || null,
        bill_to_address: formData.bill_to_address.trim(),
        state_id: formData.state_id || null,
        state_code: formData.state_code || null,
        alpha_code: formData.alpha_code || null,
        is_active: true,
      });

      if (error) throw error;

      alert('Customer GST record added successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error adding customer GST record:', error);
      alert(error.message || 'Failed to add customer GST record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add Customer GST</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Code <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.customer_code}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.customer_id} - {customer.customer_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
              </label>
              <input
                type="text"
                value={formData.customer_name}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                placeholder="Auto-populated"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GSTIN
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter GSTIN (15 characters)"
                maxLength={15}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill To Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.bill_to_address}
                onChange={(e) => setFormData({ ...formData, bill_to_address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                required
                placeholder="Enter billing address"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <select
                value={formData.state_id}
                onChange={(e) => handleStateChange(e.target.value)}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State Code
              </label>
              <input
                type="text"
                value={formData.state_code}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                placeholder="Auto-populated"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State Alpha Code
              </label>
              <input
                type="text"
                value={formData.alpha_code}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                placeholder="Auto-populated"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Customer GST'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
