import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save } from 'lucide-react';

interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
  branch_city: string;
}

interface SACCode {
  sac_id: string;
  sac_code: string;
  sac_description: string;
}

interface State {
  id: string;
  state_name: string;
  state_code: string;
  alpha_code: string;
}

interface CustomerGST {
  id: string;
  customer_code: string;
  customer_name: string;
  bill_to_address: string;
  state_id: string;
  alpha_code: string;
}

interface EditLRBillModalProps {
  billId: string;
  tranId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditLRBillModal({ billId, tranId, onClose, onSuccess }: EditLRBillModalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sacCodes, setSACCodes] = useState<SACCode[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [billingPartyCode, setBillingPartyCode] = useState('');

  const [formData, setFormData] = useState({
    lr_bill_date: '',
    lr_bill_due_date: '',
    lr_bill_status: 'Draft',
    bill_generation_branch: '',
    bill_to_state: '',
    bill_to_address: '',
    bill_to_gstin: '',
    lr_bill_sub_date: '',
    lr_bill_sub_type: '',
    lr_bill_sub_details: '',
    sac_code: '',
    remarks: ''
  });

  useEffect(() => {
    fetchData();
  }, [billId]);

  const fetchBillAddress = async (stateName: string) => {
    if (!stateName || !billingPartyCode) return;

    try {
      const { data: stateData, error: stateError } = await supabase
        .from('state_master')
        .select('id, alpha_code')
        .eq('state_name', stateName)
        .maybeSingle();

      if (stateError) {
        console.error('Error fetching state:', stateError);
        return;
      }

      if (!stateData) return;

      const { data: gstData, error: gstError } = await supabase
        .from('customer_gst_master')
        .select('bill_to_address, gstin')
        .eq('customer_code', billingPartyCode)
        .eq('alpha_code', stateData.alpha_code)
        .eq('is_active', true)
        .maybeSingle();

      if (gstError) {
        console.error('Error fetching customer GST:', gstError);
        return;
      }

      if (gstData) {
        setFormData(prev => ({
          ...prev,
          bill_to_address: gstData.bill_to_address || '',
          bill_to_gstin: gstData.gstin || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching bill address:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [billData, sacCodesData, branchesData, statesData] = await Promise.all([
        supabase.from('lr_bill').select('*').eq('bill_id', billId).maybeSingle(),
        supabase.from('sac_code_master').select('*').eq('is_active', true).order('sac_code'),
        supabase.from('branch_master').select('*').eq('is_active', true).order('branch_name'),
        supabase.from('state_master').select('*').order('state_name')
      ]);

      if (billData.error) throw billData.error;
      if (sacCodesData.error) throw sacCodesData.error;
      if (branchesData.error) throw branchesData.error;
      if (statesData.error) throw statesData.error;

      setSACCodes(sacCodesData.data || []);
      setBranches(branchesData.data || []);
      setStates(statesData.data || []);

      if (billData.data) {
        const bill = billData.data;
        setBillingPartyCode(bill.billing_party_code || '');
        setFormData({
          lr_bill_date: bill.lr_bill_date || '',
          lr_bill_due_date: bill.lr_bill_due_date || '',
          lr_bill_status: bill.lr_bill_status || 'Draft',
          bill_generation_branch: bill.bill_generation_branch || '',
          bill_to_state: bill.bill_to_state || '',
          bill_to_address: bill.bill_to_address || '',
          bill_to_gstin: bill.bill_to_gstin || '',
          lr_bill_sub_date: bill.lr_bill_sub_date || '',
          lr_bill_sub_type: bill.lr_bill_sub_type || '',
          lr_bill_sub_details: bill.lr_bill_sub_details || '',
          sac_code: bill.sac_code || '',
          remarks: bill.cancellation_reason || ''
        });

        setInitialLoad(false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading bill data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.lr_bill_date) {
      alert('Please enter bill date');
      return;
    }

    if (!formData.bill_generation_branch) {
      alert('Please select bill generation branch');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('lr_bill')
        .update({
          lr_bill_date: formData.lr_bill_date,
          lr_bill_due_date: formData.lr_bill_due_date || null,
          lr_bill_status: formData.lr_bill_status,
          bill_generation_branch: formData.bill_generation_branch,
          bill_to_state: formData.bill_to_state || null,
          bill_to_address: formData.bill_to_address || null,
          bill_to_gstin: formData.bill_to_gstin || null,
          lr_bill_sub_date: formData.lr_bill_sub_date || null,
          lr_bill_sub_type: formData.lr_bill_sub_type || null,
          lr_bill_sub_details: formData.lr_bill_sub_details || null,
          sac_code: formData.sac_code || null,
          cancellation_reason: formData.remarks || null
        })
        .eq('bill_id', billId);

      if (updateError) {
        console.error('Error updating LR bill:', updateError);
        alert(`Error updating LR bill: ${updateError.message}`);
        setLoading(false);
        return;
      }

      const { error: bookingUpdateError } = await supabase
        .from('booking_lr')
        .update({
          bill_date: formData.lr_bill_date,
          bill_due_date: formData.lr_bill_due_date || null,
          bill_to_state: formData.bill_to_state || null,
          bill_to_address: formData.bill_to_address || null,
          bill_to_gstin: formData.bill_to_gstin || null,
        })
        .eq('tran_id', tranId);

      if (bookingUpdateError) {
        console.error('Error updating booking_lr:', bookingUpdateError);
        alert(`Error syncing to booking record: ${bookingUpdateError.message}`);
        setLoading(false);
        return;
      }

      alert('LR bill updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating LR bill:', error);
      alert(`Error updating LR bill: ${error?.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">Edit LR Bill</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Editable Fields</h3>
            <p className="text-xs text-blue-700">You can edit the following fields: Bill Date, Bill To State, SAC Code, and Bill Generation Branch</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Date *
              </label>
              <input
                type="date"
                value={formData.lr_bill_date}
                onChange={(e) => setFormData({ ...formData, lr_bill_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill To State
              </label>
              <select
                value={formData.bill_to_state}
                onChange={(e) => {
                  const newState = e.target.value;
                  setFormData({ ...formData, bill_to_state: newState });
                  if (newState) {
                    fetchBillAddress(newState);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select State</option>
                {states.map(state => (
                  <option key={state.id} value={state.state_name}>
                    {state.state_name} ({state.alpha_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Generation Branch *
              </label>
              <select
                value={formData.bill_generation_branch}
                onChange={(e) => setFormData({ ...formData, bill_generation_branch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name} ({branch.branch_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SAC Code
              </label>
              <select
                value={formData.sac_code}
                onChange={(e) => setFormData({ ...formData, sac_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select SAC Code</option>
                {sacCodes.map(sac => (
                  <option key={sac.sac_id} value={sac.sac_code}>
                    {sac.sac_code} - {sac.sac_description}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill To Address
              </label>
              <textarea
                value={formData.bill_to_address}
                onChange={(e) => setFormData({ ...formData, bill_to_address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Auto-populated from Customer GST Master when state is selected"
              />
              <p className="text-xs text-gray-500 mt-1">
                This address is auto-fetched from Customer GST Master based on the selected state
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill To GSTIN
              </label>
              <input
                type="text"
                value={formData.bill_to_gstin}
                onChange={(e) => setFormData({ ...formData, bill_to_gstin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Auto-populated from Customer GST Master"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-fetched from Customer GST Master based on the selected state
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Due Date
              </label>
              <input
                type="date"
                value={formData.lr_bill_due_date}
                onChange={(e) => setFormData({ ...formData, lr_bill_due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Status
              </label>
              <select
                value={formData.lr_bill_status}
                onChange={(e) => setFormData({ ...formData, lr_bill_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Submission Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submission Date
                </label>
                <input
                  type="date"
                  value={formData.lr_bill_sub_date}
                  onChange={(e) => setFormData({ ...formData, lr_bill_sub_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submission Type
                </label>
                <select
                  value={formData.lr_bill_sub_type}
                  onChange={(e) => setFormData({ ...formData, lr_bill_sub_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="Email">Email</option>
                  <option value="Hand Delivery">Hand Delivery</option>
                  <option value="Courier">Courier</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Portal">Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submission Details
                </label>
                <input
                  type="text"
                  value={formData.lr_bill_sub_details}
                  onChange={(e) => setFormData({ ...formData, lr_bill_sub_details: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Email sent to finance@customer.com"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional notes or remarks"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Updating...' : 'Update Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
