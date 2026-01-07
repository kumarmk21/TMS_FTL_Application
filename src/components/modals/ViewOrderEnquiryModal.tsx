import { X } from 'lucide-react';

interface ViewOrderEnquiryModalProps {
  enquiry: {
    id: string;
    enq_id: string;
    entry_date: string;
    loading_date: string;
    customer_id: string;
    origin_id: string;
    destination_id: string;
    vehicle_type_id: string;
    weight_mt: number;
    expected_rate: number | null;
    status: string;
    vendor_id: string | null;
    vehicle_number: string | null;
    driver_number: string | null;
    truck_hire: number | null;
    cancellation_reason: string | null;
    customer_master: { customer_name: string };
    origin: { city_name: string };
    destination: { city_name: string };
    vehicle_master: { vehicle_type: string };
    vendor_master: { vendor_name: string } | null;
  };
  onClose: () => void;
}

export function ViewOrderEnquiryModal({ enquiry, onClose }: ViewOrderEnquiryModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <h2 className="text-2xl font-bold text-gray-800">Order Details - {enquiry.enq_id}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Status</span>
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                {enquiry.status}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Order Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Enquiry ID</label>
                <p className="text-gray-900 font-semibold">{enquiry.enq_id}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Entry Date</label>
                <p className="text-gray-900">{new Date(enquiry.entry_date).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Loading Date</label>
                <p className="text-gray-900">{new Date(enquiry.loading_date).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Customer</label>
                <p className="text-gray-900">{enquiry.customer_master?.customer_name || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Origin</label>
                <p className="text-gray-900">{enquiry.origin?.city_name || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Destination</label>
                <p className="text-gray-900">{enquiry.destination?.city_name || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Vehicle Type</label>
                <p className="text-gray-900">{enquiry.vehicle_master?.vehicle_type || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Weight (MT)</label>
                <p className="text-gray-900">{enquiry.weight_mt}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Expected Rate</label>
                <p className="text-gray-900">{enquiry.expected_rate ? `₹${enquiry.expected_rate}` : '-'}</p>
              </div>
            </div>
          </div>

          {enquiry.status === 'Confirmed' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Confirmation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Vendor</label>
                  <p className="text-gray-900 font-semibold">{enquiry.vendor_master?.vendor_name || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Vehicle Number</label>
                  <p className="text-gray-900 font-semibold uppercase">{enquiry.vehicle_number || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Driver Number</label>
                  <p className="text-gray-900 font-semibold">{enquiry.driver_number || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Truck Hire</label>
                  <p className="text-gray-900 font-semibold">{enquiry.truck_hire ? `₹${enquiry.truck_hire}` : '-'}</p>
                </div>
              </div>
            </div>
          )}

          {enquiry.status === 'Cancelled' && enquiry.cancellation_reason && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Cancellation Details</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Cancellation Reason</label>
                <p className="text-gray-900">{enquiry.cancellation_reason}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
