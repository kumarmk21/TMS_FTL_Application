import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface GenerateTHCModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lrRecord: {
    tran_id: string;
    manual_lr_no: string;
    vehicle_number: string;
  };
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
  account_no: string;
  bank_name: string;
  ifsc_code: string;
  ven_bk_branch: string;
  tds_applicable: string;
  tds_rate: number;
}

interface LRDetails {
  vehicle_number: string;
  driver_number: string;
  vendor_code: string;
  expected_rate: number;
}

export function GenerateTHCModal({ isOpen, onClose, onSuccess, lrRecord }: GenerateTHCModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [lrDetails, setLrDetails] = useState<LRDetails | null>(null);

  const [formData, setFormData] = useState({
    thc_date: new Date().toISOString().split('T')[0],
    thc_number: '',
    thc_vendor: '',
    vehicle_number: '',
    lr_number: '',
    driver_number: '',
    ft_trip_id: '',
    thc_amount: 0,
    thc_loading_charges: 0,
    thc_detention_charges: 0,
    thc_advance_amount: 0,
  });

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      fetchLRDetails();
      setFormData(prev => ({
        ...prev,
        lr_number: lrRecord.manual_lr_no,
        vehicle_number: lrRecord.vehicle_number,
      }));
    }
  }, [isOpen, lrRecord]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_master')
        .select('id, vendor_name, vendor_code, account_no, bank_name, ifsc_code, ven_bk_branch, tds_applicable, tds_rate')
        .eq('is_active', true)
        .order('vendor_name', { ascending: true });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchLRDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('vehicle_number, driver_number, vendor_code, expected_rate')
        .eq('tran_id', lrRecord.tran_id)
        .single();

      if (error) throw error;
      setLrDetails(data);

      setFormData(prev => ({
        ...prev,
        vehicle_number: data.vehicle_number || lrRecord.vehicle_number,
        driver_number: data.driver_number || '',
        thc_amount: data.expected_rate || 0,
      }));

      if (data.vendor_code) {
        const vendor = vendors.find(v => v.vendor_code === data.vendor_code);
        if (vendor) {
          setSelectedVendor(vendor);
          setFormData(prev => ({ ...prev, thc_vendor: vendor.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching LR details:', error);
    }
  };

  const handleVendorChange = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    setSelectedVendor(vendor || null);
    setFormData(prev => ({ ...prev, thc_vendor: vendorId }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const calculateGrossAmount = () => {
    return formData.thc_amount + formData.thc_loading_charges + formData.thc_detention_charges;
  };

  const calculateTDSAmount = () => {
    if (!selectedVendor || selectedVendor.tds_applicable !== 'Y') return 0;
    return (formData.thc_advance_amount * selectedVendor.tds_rate) / 100;
  };

  const calculateNetPayable = () => {
    return formData.thc_advance_amount - calculateTDSAmount();
  };

  const calculateBalance = () => {
    return calculateGrossAmount() - formData.thc_advance_amount - calculateTDSAmount();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.thc_date) {
      alert('THC Date is required');
      return;
    }
    if (!formData.thc_number.trim()) {
      alert('THC Number is required');
      return;
    }
    if (!formData.thc_vendor) {
      alert('Vendor is required');
      return;
    }
    if (!formData.vehicle_number.trim()) {
      alert('Vehicle Number is required');
      return;
    }
    if (formData.thc_amount <= 0) {
      alert('THC Amount must be greater than 0');
      return;
    }
    if (formData.thc_advance_amount <= 0) {
      alert('THC Advance Amount must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const { data: docTypeData, error: docTypeError } = await supabase
        .from('doc_types')
        .select('id')
        .eq('doc_type', 'THC')
        .maybeSingle();

      if (docTypeError) throw docTypeError;

      if (!docTypeData) {
        throw new Error('THC document type not found in system');
      }

      const { data: statusOpsData, error: statusOpsError } = await supabase
        .from('status_master')
        .select('id')
        .eq('status_type', docTypeData.id)
        .eq('status_name', 'Open')
        .maybeSingle();

      if (statusOpsError) throw statusOpsError;

      const { data: statusFinData, error: statusFinError } = await supabase
        .from('status_master')
        .select('id')
        .eq('status_type', docTypeData.id)
        .eq('status_name', 'ATH Paid')
        .maybeSingle();

      if (statusFinError) throw statusFinError;

      const { data: thcIdData, error: thcIdError } = await supabase
        .rpc('generate_thc_id');

      if (thcIdError) throw thcIdError;
      const thcIdNumber = thcIdData;

      const grossAmount = calculateGrossAmount();
      const tdsAmount = calculateTDSAmount();
      const netPayableAmount = calculateNetPayable();
      const balanceAmount = calculateBalance();

      const { error: insertError } = await supabase
        .from('thc_details')
        .insert({
          thc_id_number: thcIdNumber,
          tran_id: lrRecord.tran_id,
          thc_date: formData.thc_date,
          thc_entry_date: new Date().toISOString().split('T')[0],
          thc_number: formData.thc_number,
          thc_vendor: formData.thc_vendor,
          vehicle_number: formData.vehicle_number,
          lr_number: formData.lr_number,
          driver_number: formData.driver_number || null,
          ft_trip_id: formData.ft_trip_id || null,
          thc_amount: formData.thc_amount,
          thc_loading_charges: formData.thc_loading_charges,
          thc_detention_charges: formData.thc_detention_charges,
          thc_gross_amount: grossAmount,
          thc_advance_amount: formData.thc_advance_amount,
          thc_tds_amount: tdsAmount,
          thc_net_payable_amount: netPayableAmount,
          thc_balance_amount: balanceAmount,
          ven_act_name: selectedVendor?.vendor_name || null,
          ven_act_number: selectedVendor?.account_no || null,
          ven_act_bank: selectedVendor?.bank_name || null,
          ven_act_ifsc: selectedVendor?.ifsc_code || null,
          ven_act_branch: selectedVendor?.ven_bk_branch || null,
          thc_status_ops: statusOpsData?.id || null,
          thc_status_fin: statusFinData?.id || null,
          created_by: user?.id,
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('booking_lr')
        .update({
          thc_no: formData.thc_number,
          thc_date: formData.thc_date,
        })
        .eq('tran_id', lrRecord.tran_id);

      if (updateError) throw updateError;

      alert('THC generated successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error generating THC:', error);
      alert(error.message || 'Failed to generate THC');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Generate THC (Truck Hire Challan)</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                THC Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="thc_date"
                value={formData.thc_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                THC Number (Bhada Challan Number) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="thc_number"
                value={formData.thc_number}
                onChange={handleInputChange}
                placeholder="Enter Bhada Challan Number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <select
                name="thc_vendor"
                value={formData.thc_vendor}
                onChange={(e) => handleVendorChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendor_name} ({vendor.vendor_code})
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
                name="vehicle_number"
                value={formData.vehicle_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                required
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LR Number
              </label>
              <input
                type="text"
                name="lr_number"
                value={formData.lr_number}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Driver Number
              </label>
              <input
                type="text"
                name="driver_number"
                value={formData.driver_number}
                onChange={handleInputChange}
                placeholder="Enter driver number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FT Trip ID
              </label>
              <input
                type="text"
                name="ft_trip_id"
                value={formData.ft_trip_id}
                onChange={handleInputChange}
                placeholder="Enter FT Trip ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Amount Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  THC Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="thc_amount"
                  value={formData.thc_amount}
                  onChange={handleNumberChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loading Charges
                </label>
                <input
                  type="number"
                  name="thc_loading_charges"
                  value={formData.thc_loading_charges}
                  onChange={handleNumberChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detention Charges
                </label>
                <input
                  type="number"
                  name="thc_detention_charges"
                  value={formData.thc_detention_charges}
                  onChange={handleNumberChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  THC Gross Amount
                </label>
                <p className="text-lg font-bold text-blue-600">
                  ₹{calculateGrossAmount().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  THC Advance Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="thc_advance_amount"
                  value={formData.thc_advance_amount}
                  onChange={handleNumberChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TDS Amount
                </label>
                <p className="text-lg font-bold text-yellow-600">
                  ₹{calculateTDSAmount().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {selectedVendor && selectedVendor.tds_applicable === 'Y' && (
                  <p className="text-xs text-gray-600 mt-1">TDS @ {selectedVendor.tds_rate}%</p>
                )}
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  THC Net Payable Amount
                </label>
                <p className="text-lg font-bold text-green-600">
                  ₹{calculateNetPayable().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-red-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  THC Balance Amount
                </label>
                <p className="text-lg font-bold text-red-600">
                  ₹{calculateBalance().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {selectedVendor && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVendor.vendor_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVendor.account_no || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVendor.bank_name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVendor.ifsc_code || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Branch</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVendor.ven_bk_branch || '-'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
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
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Generating...' : 'Generate THC'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
