import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface UpdateOrderEnquiryModalProps {
  enquiry: {
    id: string;
    enq_id: string;
    status: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface Vendor {
  id: string;
  vendor_name: string;
}

export function UpdateOrderEnquiryModal({ enquiry, onClose, onSuccess }: UpdateOrderEnquiryModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [actionType, setActionType] = useState<'Confirmed' | 'Cancelled' | ''>('');

  const [formData, setFormData] = useState({
    vendor_id: '',
    vehicle_number: '',
    driver_number: '',
    truck_hire: '',
    cancellation_reason: '',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_master')
        .select('id, vendor_name')
        .eq('is_active', true)
        .order('vendor_name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!actionType) {
      alert('Please select an action (Confirmed or Cancelled)');
      return;
    }

    if (actionType === 'Confirmed') {
      if (!formData.vendor_id || !formData.vehicle_number || !formData.driver_number || !formData.truck_hire) {
        alert('All fields are required for confirmation');
        return;
      }

      if (formData.driver_number.length !== 10 || !/^\d+$/.test(formData.driver_number)) {
        alert('Driver number must be exactly 10 digits');
        return;
      }
    }

    if (actionType === 'Cancelled' && !formData.cancellation_reason) {
      alert('Cancellation reason is required');
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        status: actionType,
        updated_by: profile?.id,
      };

      if (actionType === 'Confirmed') {
        updateData.vendor_id = formData.vendor_id;
        updateData.vehicle_number = formData.vehicle_number;
        updateData.driver_number = formData.driver_number;
        updateData.truck_hire = parseFloat(formData.truck_hire);
        updateData.cancellation_reason = null;
      } else {
        updateData.cancellation_reason = formData.cancellation_reason;
        updateData.vendor_id = null;
        updateData.vehicle_number = null;
        updateData.driver_number = null;
        updateData.truck_hire = null;
      }

      const { error } = await supabase
        .from('order_enquiry')
        .update(updateData)
        .eq('id', enquiry.id);

      if (error) throw error;

      alert(`Enquiry ${actionType.toLowerCase()} successfully!`);
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Update Order Status - {enquiry.enq_id}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={actionType}
              onChange={(e) => setActionType(e.target.value as 'Confirmed' | 'Cancelled' | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Action</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {actionType === 'Confirmed' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.vendor_id}
                  onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="Enter vehicle number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.driver_number}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, driver_number: value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter 10-digit driver number"
                  maxLength={10}
                />
                {formData.driver_number && formData.driver_number.length !== 10 && (
                  <p className="text-sm text-red-600 mt-1">Driver number must be exactly 10 digits</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Truck Hire (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.truck_hire}
                  onChange={(e) => setFormData({ ...formData, truck_hire: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter truck hire amount"
                />
              </div>
            </>
          )}

          {actionType === 'Cancelled' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.cancellation_reason}
                onChange={(e) => setFormData({ ...formData, cancellation_reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Reason</option>
                <option value="Vehicle Not Available">Vehicle Not Available</option>
                <option value="Rate Not Approved by Customer">Rate Not Approved by Customer</option>
                <option value="Customer Cancelled the order">Customer Cancelled the order</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
