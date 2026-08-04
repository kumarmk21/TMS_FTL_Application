import { useState, useEffect } from 'react';
import { X, ArrowRight, Save, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ChangeBillingPartyModalProps {
  billId: string;
  billNumber: string;
  tranId: string | null;
  currentBillingPartyCode: string;
  currentBillingPartyName: string;
  currentBillToGstin: string;
  currentBillToState: string;
  currentBillToAddress: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface CustomerMaster {
  customer_id: string;
  customer_name: string;
  credit_days: number;
}

interface CustomerGST {
  id: string;
  customer_code: string;
  gstin: string;
  bill_to_address: string;
  state_id: string;
  state_name: string;
}

export function ChangeBillingPartyModal({
  billId,
  billNumber,
  tranId,
  currentBillingPartyCode,
  currentBillingPartyName,
  currentBillToGstin,
  currentBillToState,
  currentBillToAddress,
  onClose,
  onSuccess,
}: ChangeBillingPartyModalProps) {
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [customerGSTs, setCustomerGSTs] = useState<CustomerGST[]>([]);
  const [selectedCustomerCode, setSelectedCustomerCode] = useState('');
  const [selectedGSTId, setSelectedGSTId] = useState('');
  const [newBillToAddress, setNewBillToAddress] = useState('');
  const [newBillToGstin, setNewBillToGstin] = useState('');
  const [newBillToState, setNewBillToState] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingGST, setFetchingGST] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_master')
        .select('customer_id, customer_name, credit_days')
        .order('customer_name');

      if (error) throw error;
      setCustomers((data || []) as CustomerMaster[]);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Error loading customer list');
    }
  };

  const handleCustomerChange = async (customerCode: string) => {
    setSelectedCustomerCode(customerCode);
    setSelectedGSTId('');
    setNewBillToAddress('');
    setNewBillToGstin('');
    setNewBillToState('');

    if (!customerCode) {
      setCustomerGSTs([]);
      return;
    }

    setFetchingGST(true);
    try {
      const { data, error } = await supabase
        .from('customer_gst_master')
        .select('id, customer_code, gstin, bill_to_address, state_id, state_master(state_name)')
        .eq('customer_code', customerCode)
        .eq('is_active', true);

      if (error) throw error;

      const formatted = (data || []).map((gst: any) => ({
        id: gst.id,
        customer_code: gst.customer_code,
        gstin: gst.gstin || '',
        bill_to_address: gst.bill_to_address || '',
        state_id: gst.state_id || '',
        state_name: (gst.state_master as any)?.state_name || '',
      }));

      setCustomerGSTs(formatted);
    } catch (error) {
      console.error('Error fetching customer GST:', error);
      alert('Error loading GST details for selected customer');
    } finally {
      setFetchingGST(false);
    }
  };

  const handleGSTChange = (gstId: string) => {
    setSelectedGSTId(gstId);
    const selected = customerGSTs.find((g) => g.id === gstId);
    if (selected) {
      setNewBillToAddress(selected.bill_to_address);
      setNewBillToGstin(selected.gstin);
      setNewBillToState(selected.state_name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerCode) {
      alert('Please select a new billing party');
      return;
    }

    if (!selectedGSTId) {
      alert('Please select a GST entry for the new billing party');
      return;
    }

    const newCustomer = customers.find((c) => c.customer_id === selectedCustomerCode);
    const newBillingPartyName = newCustomer?.customer_name || '';

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: billUpdateError } = await supabase
        .from('lr_bill')
        .update({
          billing_party_code: selectedCustomerCode,
          billing_party_name: newBillingPartyName,
          bill_to_gstin: newBillToGstin || null,
          bill_to_state: newBillToState || null,
          bill_to_address: newBillToAddress || null,
        })
        .eq('bill_id', billId);

      if (billUpdateError) throw billUpdateError;

      const bookingPayload = {
        billing_party_code: selectedCustomerCode,
        billing_party_name: newBillingPartyName,
        bill_to_gstin: newBillToGstin || null,
        bill_to_state: newBillToState || null,
        bill_to_address: newBillToAddress || null,
      };

      let bookingError = null;
      if (tranId && tranId !== 'null') {
        const { error } = await supabase
          .from('booking_lr')
          .update(bookingPayload)
          .eq('tran_id', tranId);
        bookingError = error;
      } else if (billNumber) {
        const { error } = await supabase
          .from('booking_lr')
          .update(bookingPayload)
          .eq('bill_no', billNumber);
        bookingError = error;
      }

      if (bookingError) throw bookingError;

      const { error: auditError } = await supabase
        .from('bill_billing_party_changes')
        .insert([{
          bill_id: billId,
          bill_number: billNumber,
          tran_id: tranId && tranId !== 'null' ? tranId : null,
          old_billing_party_code: currentBillingPartyCode || null,
          old_billing_party_name: currentBillingPartyName || null,
          old_bill_to_gstin: currentBillToGstin || null,
          old_bill_to_state: currentBillToState || null,
          old_bill_to_address: currentBillToAddress || null,
          new_billing_party_code: selectedCustomerCode,
          new_billing_party_name: newBillingPartyName,
          new_bill_to_gstin: newBillToGstin || null,
          new_bill_to_state: newBillToState || null,
          new_bill_to_address: newBillToAddress || null,
          change_reason: changeReason.trim() || null,
          changed_by: user.id,
        }]);

      if (auditError) {
        console.error('Error writing audit log:', auditError);
      }

      alert('Billing party changed successfully! The bill and linked LR have been updated.');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error changing billing party:', error);
      alert(error?.message || 'Failed to change billing party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Change Billing Party</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Warning:</strong> Changing the billing party will update both the bill record
              and the linked LR record. The previous billing party details will be preserved in an
              audit log for future reference.
            </p>
          </div>

          {/* Current Billing Party */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Current Billing Party</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Customer:</span>{' '}
                <span className="font-medium text-gray-900">{currentBillingPartyName || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Code:</span>{' '}
                <span className="font-medium text-gray-900">{currentBillingPartyCode || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">GSTIN:</span>{' '}
                <span className="font-medium text-gray-900">{currentBillToGstin || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">State:</span>{' '}
                <span className="font-medium text-gray-900">{currentBillToState || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Address:</span>{' '}
                <span className="font-medium text-gray-900">{currentBillToAddress || '-'}</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-8 h-8 text-blue-600 rotate-90" />
          </div>

          {/* New Billing Party */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="text-sm font-semibold text-blue-700 uppercase mb-3">New Billing Party</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer *
                </label>
                <select
                  required
                  value={selectedCustomerCode}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.customer_name} ({c.customer_id})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomerCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select GST Entry *
                  </label>
                  {fetchingGST ? (
                    <p className="text-sm text-gray-500 py-2">Loading GST details...</p>
                  ) : customerGSTs.length === 0 ? (
                    <p className="text-sm text-red-600 py-2">
                      No active GST entries found for this customer. Please add a GST entry in
                      Customer GST Master first.
                    </p>
                  ) : (
                    <select
                      required
                      value={selectedGSTId}
                      onChange={(e) => handleGSTChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Select GST Entry --</option>
                      {customerGSTs.map((gst) => (
                        <option key={gst.id} value={gst.id}>
                          {gst.state_name} - {gst.gstin || 'No GSTIN'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {selectedGSTId && (
                <div className="grid grid-cols-2 gap-3 text-sm bg-white rounded-lg p-3 border border-gray-200">
                  <div>
                    <span className="text-gray-500">GSTIN:</span>{' '}
                    <span className="font-medium text-gray-900">{newBillToGstin || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">State:</span>{' '}
                    <span className="font-medium text-gray-900">{newBillToState || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Address:</span>{' '}
                    <span className="font-medium text-gray-900">{newBillToAddress || '-'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Change Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Change (Optional)
            </label>
            <textarea
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Wrong customer selected during bill generation"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedGSTId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Updating...' : 'Confirm Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
