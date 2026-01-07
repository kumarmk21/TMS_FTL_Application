import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Customer {
  id: string;
  customer_id: string;
  customer_name: string;
  is_active: boolean;
  group_id: string | null;
  sales_person: string | null;
  gstin: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  lr_mail_id: string | null;
  customer_contact: string | null;
  contract_type: string | null;
  credit_days: number | null;
}

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer: Customer;
}

export function EditCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  customer,
}: EditCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: customer.customer_name,
    is_active: customer.is_active,
    group_id: customer.group_id || '',
    sales_person: customer.sales_person || '',
    gstin: customer.gstin || '',
    customer_address: customer.customer_address || '',
    customer_city: customer.customer_city || '',
    customer_state: customer.customer_state || '',
    customer_phone: customer.customer_phone || '',
    customer_email: customer.customer_email || '',
    lr_mail_id: customer.lr_mail_id || '',
    customer_contact: customer.customer_contact || '',
    contract_type: customer.contract_type || '',
    credit_days: customer.credit_days?.toString() || '',
  });

  useEffect(() => {
    setFormData({
      customer_name: customer.customer_name,
      is_active: customer.is_active,
      group_id: customer.group_id || '',
      sales_person: customer.sales_person || '',
      gstin: customer.gstin || '',
      customer_address: customer.customer_address || '',
      customer_city: customer.customer_city || '',
      customer_state: customer.customer_state || '',
      customer_phone: customer.customer_phone || '',
      customer_email: customer.customer_email || '',
      lr_mail_id: customer.lr_mail_id || '',
      customer_contact: customer.customer_contact || '',
      contract_type: customer.contract_type || '',
      credit_days: customer.credit_days?.toString() || '',
    });
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('customer_master')
        .update({
          customer_name: formData.customer_name.toUpperCase(),
          is_active: formData.is_active,
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer.id);

      if (error) throw error;

      alert('Customer updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      alert(error.message || 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Customer</h2>
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
                Customer ID
              </label>
              <input
                type="text"
                value={customer.customer_id}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed uppercase font-medium"
              />
              <p className="text-xs text-gray-500 mt-1">Customer ID cannot be changed</p>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.customer_city}
                onChange={(e) => setFormData({ ...formData, customer_city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.customer_state}
                onChange={(e) => setFormData({ ...formData, customer_state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
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
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">Inactive customers will be hidden from selections</p>
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
