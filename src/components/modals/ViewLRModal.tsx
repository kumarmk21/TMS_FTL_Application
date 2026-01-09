import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ViewLRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tranId: string;
}

interface LRDetails {
  manual_lr_no: string;
  lr_date: string;
  entry_date: string;
  booking_branch: string;
  from_city: string;
  to_city: string;
  billing_party_code: string;
  billing_party_name: string;
  bill_to_gstin: string;
  bill_to_address: string;
  bill_to_state: string;
  vehicle_type: string;
  vehicle_number: string;
  driver_name: string;
  driver_number: string;
  pay_basis: string;
  booking_type: string;
  product: string;
  consignor: string;
  consignee: string;
  no_of_pkgs: number;
  act_wt: number;
  chrg_wt: number;
  invoice_number: string;
  invoice_date: string;
  invoice_value: number;
  eway_bill_number: string;
  eway_bill_exp_date: string;
  freight_rate: number;
  freight_amount: number;
  loading_charges: number;
  unloading_charges: number;
  detention_charges: number;
  docket_charges: number;
  penalties_oth_charges: number;
  subtotal: number;
  gst_charge_type: string;
  gst_amount: number;
  lr_total_amount: number;
  lr_status: string;
}

export function ViewLRModal({ isOpen, onClose, tranId }: ViewLRModalProps) {
  const [loading, setLoading] = useState(true);
  const [lrDetails, setLrDetails] = useState<LRDetails | null>(null);

  useEffect(() => {
    if (isOpen && tranId) {
      fetchLRDetails();
    }
  }, [isOpen, tranId]);

  const fetchLRDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_lr')
        .select('*')
        .eq('tran_id', tranId)
        .single();

      if (error) throw error;
      setLrDetails(data);
    } catch (error: any) {
      console.error('Error fetching LR details:', error);
      alert(error.message || 'Failed to fetch LR details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">LR Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        ) : lrDetails ? (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3 bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">LR Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">LR Number</label>
                    <p className="mt-1 text-sm text-gray-900 font-semibold">{lrDetails.manual_lr_no}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">LR Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(lrDetails.lr_date)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Entry Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(lrDetails.entry_date)}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Route & Party Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Booking Branch</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.booking_branch || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Origin</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.from_city || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Destination</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.to_city || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Billing Party Code</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.billing_party_code || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Billing Party Name</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.billing_party_name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">GSTIN</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.bill_to_gstin || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Billing Address</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.bill_to_address || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.bill_to_state || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle & Driver Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.vehicle_type || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle Number</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.vehicle_number || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Driver Name</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.driver_name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Driver Number</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.driver_number || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pay Basis</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.pay_basis || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Booking Type</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.booking_type || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.product || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.lr_status || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Consignor</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.consignor || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Consignee</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.consignee || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cargo Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">No. of Packages</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.no_of_pkgs || 0}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Actual Weight</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.act_wt || 0} kg</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chargeable Weight</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.chrg_wt || 0} kg</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Value</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(lrDetails.invoice_value)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.invoice_number || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(lrDetails.invoice_date)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">E-Way Bill Number</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.eway_bill_number || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">E-Way Bill Expiry</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(lrDetails.eway_bill_exp_date)}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Freight Rate</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(lrDetails.freight_rate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Freight Amount</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(lrDetails.freight_amount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loading Charges</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(lrDetails.loading_charges)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unloading Charges</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(lrDetails.unloading_charges)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Detention Charges</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(lrDetails.detention_charges)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Docket Charges</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(lrDetails.docket_charges)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Penalties/Other Charges</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(lrDetails.penalties_oth_charges)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                    <p className="mt-1 text-sm text-gray-900 font-semibold">{formatCurrency(lrDetails.subtotal)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">GST Type</label>
                    <p className="mt-1 text-sm text-gray-900">{lrDetails.gst_charge_type || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">GST Amount</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(lrDetails.gst_amount)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <p className="mt-1 text-lg text-red-600 font-bold">{formatCurrency(lrDetails.lr_total_amount)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No LR details found
          </div>
        )}
      </div>
    </div>
  );
}
