import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface PODRecord {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  billing_party_name: string;
  from_city: string;
  to_city: string;
  est_del_date: string | null;
  act_del_date: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
}

interface THCDetails {
  thc_id: string | null;
  thc_date: string | null;
  thc_vendor: string | null;
  thc_net_payable_amount: number;
  thc_advance_amount: number;
  thc_balance_amount: number;
}

interface UpdatePODModalProps {
  record: PODRecord;
  onClose: () => void;
}

export default function UpdatePODModal({ record, onClose }: UpdatePODModalProps) {
  const [thcDetails, setThcDetails] = useState<THCDetails>({
    thc_id: null,
    thc_date: null,
    thc_vendor: null,
    thc_net_payable_amount: 0,
    thc_advance_amount: 0,
    thc_balance_amount: 0,
  });
  const [podRecdDate, setPodRecdDate] = useState('');
  const [podRecdType, setPodRecdType] = useState('');
  const [podCourierNumber, setPodCourierNumber] = useState('');
  const [podFile, setPodFile] = useState<File | null>(null);
  const [thcUnloadingCharges, setThcUnloadingCharges] = useState<string>('0');
  const [thcDetentionCharges, setThcDetentionCharges] = useState<string>('0');
  const [thcDeductionDelay, setThcDeductionDelay] = useState<string>('0');
  const [thcDeductionDamage, setThcDeductionDamage] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingTHC, setLoadingTHC] = useState(true);
  const [statusUUIDs, setStatusUUIDs] = useState<{
    hardcopyPod: string | null;
    onTime: string | null;
    delay: string | null;
  }>({
    hardcopyPod: null,
    onTime: null,
    delay: null,
  });

  useEffect(() => {
    fetchStatusUUIDs();
    fetchTHCDetails();
  }, [record.manual_lr_no]);

  const fetchStatusUUIDs = async () => {
    try {
      const { data, error } = await supabase
        .from('status_master')
        .select('id, status_name')
        .in('status_name', ['HARDCOPYPOD', 'ON TIME', 'DELAY']);

      if (error) throw error;

      if (data) {
        const uuids = {
          hardcopyPod: data.find(s => s.status_name === 'HARDCOPYPOD')?.id || null,
          onTime: data.find(s => s.status_name === 'ON TIME')?.id || null,
          delay: data.find(s => s.status_name === 'DELAY')?.id || null,
        };
        setStatusUUIDs(uuids);
      }
    } catch (error) {
      console.error('Error fetching status UUIDs:', error);
    }
  };

  const fetchTHCDetails = async () => {
    try {
      setLoadingTHC(true);
      const { data, error } = await supabase
        .from('thc_details')
        .select(`
          thc_id,
          thc_date,
          thc_vendor,
          thc_net_payable_amount,
          thc_advance_amount,
          thc_balance_amount,
          vendor_master!thc_details_thc_vendor_fkey(vendor_name)
        `)
        .eq('lr_number', record.manual_lr_no)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const vendorName = data.vendor_master?.vendor_name || data.thc_vendor || '-';
        setThcDetails({
          thc_id: data.thc_id,
          thc_date: data.thc_date,
          thc_vendor: vendorName,
          thc_net_payable_amount: data.thc_net_payable_amount || 0,
          thc_advance_amount: data.thc_advance_amount || 0,
          thc_balance_amount: data.thc_balance_amount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching THC details:', error);
    } finally {
      setLoadingTHC(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const maxSize = 5 * 1024 * 1024;

      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF or image file (JPG, JPEG, PNG)');
        e.target.value = '';
        return;
      }

      if (file.size > maxSize) {
        setError('File size should not exceed 5MB');
        e.target.value = '';
        return;
      }

      setPodFile(file);
      setError('');
    }
  };

  const validateForm = () => {
    if (!podRecdDate) {
      setError('POD Received Date is required');
      return false;
    }

    if (!podRecdType) {
      setError('POD Received Type is required');
      return false;
    }

    if (podRecdType === 'By Courier') {
      if (!podCourierNumber) {
        setError('POD Courier Number is required');
        return false;
      }
      if (!podFile) {
        setError('POD Document upload is required for courier delivery');
        return false;
      }
    }

    if (podRecdType === 'Hand Delivery') {
      if (!podFile) {
        setError('POD Document upload is required for hand delivery');
        return false;
      }
    }

    return true;
  };

  const calculateNewBalanceAmount = () => {
    const unloading = parseFloat(thcUnloadingCharges) || 0;
    const detention = parseFloat(thcDetentionCharges) || 0;
    const deductionDelay = parseFloat(thcDeductionDelay) || 0;
    const deductionDamage = parseFloat(thcDeductionDamage) || 0;

    return thcDetails.thc_balance_amount + unloading + detention - deductionDelay - deductionDamage;
  };

  const uploadPODFile = async () => {
    if (!podFile) return null;

    const fileExt = podFile.name.split('.').pop();
    const fileName = `${record.manual_lr_no}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('pod-documents')
      .upload(filePath, podFile);

    if (uploadError) throw uploadError;

    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    try {
      setLoading(true);

      let podUploadPath = null;
      if (podFile) {
        podUploadPath = await uploadPODFile();
      }

      const updateData: any = {
        pod_recd_date: podRecdDate,
        pod_recd_type: podRecdType,
        lr_status: 'POD Recd',
        lr_ops_status: 'PODHARDCOPY',
        entry_date: new Date().toISOString(),
      };

      if (podRecdType === 'By Courier') {
        updateData.pod_courier_number = podCourierNumber;
      }

      if (podUploadPath) {
        updateData.pod_upload = podUploadPath;
      }

      const { error: updateError } = await supabase
        .from('booking_lr')
        .update(updateData)
        .eq('tran_id', record.tran_id);

      if (updateError) throw updateError;

      if (thcDetails.thc_id && statusUUIDs.hardcopyPod) {
        const newBalanceAmount = calculateNewBalanceAmount();
        const podDate = new Date(podRecdDate);
        const bthDueDate = new Date(podDate);
        bthDueDate.setDate(bthDueDate.getDate() + 45);

        let thcStatusOpsId = statusUUIDs.onTime;
        if (record.act_del_date && record.est_del_date) {
          const actDelDate = new Date(record.act_del_date);
          const estDelDate = new Date(record.est_del_date);
          if (actDelDate > estDelDate) {
            thcStatusOpsId = statusUUIDs.delay;
          }
        }

        const thcUpdateData: any = {
          thc_status_fin: statusUUIDs.hardcopyPod,
          thc_status_ops: thcStatusOpsId,
          thc_unloading_charges: parseFloat(thcUnloadingCharges) || 0,
          thc_detention_charges: parseFloat(thcDetentionCharges) || 0,
          thc_deduction_delay: parseFloat(thcDeductionDelay) || 0,
          thc_deduction_damage: parseFloat(thcDeductionDamage) || 0,
          thc_balance_amount: newBalanceAmount,
          bth_due_date: bthDueDate.toISOString().split('T')[0],
        };

        if (record.act_del_date) {
          thcUpdateData.unloading_date = record.act_del_date;
        }

        const { error: thcUpdateError } = await supabase
          .from('thc_details')
          .update(thcUpdateData)
          .eq('thc_id', thcDetails.thc_id);

        if (thcUpdateError) throw thcUpdateError;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error updating POD:', error);
      setError(error.message || 'Error updating POD details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Update POD Receipt Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">POD details updated successfully!</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">LR Details (Read-only)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">LR Number</label>
                  <p className="text-sm font-semibold text-slate-900">{record.manual_lr_no}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">LR Date</label>
                  <p className="text-sm text-slate-900">
                    {new Date(record.lr_date).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Billing Party</label>
                  <p className="text-sm text-slate-900">{record.billing_party_name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">From City</label>
                  <p className="text-sm text-slate-900">{record.from_city || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">To City</label>
                  <p className="text-sm text-slate-900">{record.to_city || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Vehicle Type</label>
                  <p className="text-sm text-slate-900">{record.vehicle_type || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Vehicle Number</label>
                  <p className="text-sm text-slate-900">{record.vehicle_number || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Est. Delivery Date</label>
                  <p className="text-sm text-slate-900">
                    {record.est_del_date ? new Date(record.est_del_date).toLocaleDateString('en-IN') : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Act. Delivery Date</label>
                  <p className="text-sm text-slate-900">
                    {record.act_del_date ? new Date(record.act_del_date).toLocaleDateString('en-IN') : '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">THC Details (Read-only)</h3>
              {loadingTHC ? (
                <p className="text-sm text-slate-600">Loading THC details...</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">THC ID</label>
                    <p className="text-sm text-slate-900">{thcDetails.thc_id || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">THC Date</label>
                    <p className="text-sm text-slate-900">
                      {thcDetails.thc_date ? new Date(thcDetails.thc_date).toLocaleDateString('en-IN') : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">THC Vendor</label>
                    <p className="text-sm text-slate-900">{thcDetails.thc_vendor || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Net Payable Amount</label>
                    <p className="text-sm text-slate-900">₹{thcDetails.thc_net_payable_amount?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Advance Amount</label>
                    <p className="text-sm text-slate-900">₹{thcDetails.thc_advance_amount?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Balance Amount</label>
                    <p className="text-sm text-slate-900">₹{thcDetails.thc_balance_amount?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">POD Receipt Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    POD Received Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={podRecdDate}
                    onChange={(e) => setPodRecdDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    POD Received Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={podRecdType}
                    onChange={(e) => setPodRecdType(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="By Courier">By Courier</option>
                    <option value="Hand Delivery">Hand Delivery</option>
                  </select>
                </div>

                {podRecdType === 'By Courier' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      POD Courier Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={podCourierNumber}
                      onChange={(e) => setPodCourierNumber(e.target.value)}
                      placeholder="Enter courier tracking number"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      required
                    />
                  </div>
                )}

                {(podRecdType === 'By Courier' || podRecdType === 'Hand Delivery') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Upload POD Document <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        required
                      />
                    </div>
                    {podFile && (
                      <p className="mt-2 text-xs text-slate-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        {podFile.name} ({(podFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      Accepted formats: PDF, JPG, JPEG, PNG (Max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {thcDetails.thc_id && (
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">THC Balance Adjustments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Unloading Charges <span className="text-green-600 text-xs">(Addition +)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={thcUnloadingCharges}
                      onChange={(e) => setThcUnloadingCharges(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Detention Charges <span className="text-green-600 text-xs">(Addition +)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={thcDetentionCharges}
                      onChange={(e) => setThcDetentionCharges(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Deduction - Delay <span className="text-red-600 text-xs">(Subtraction -)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={thcDeductionDelay}
                      onChange={(e) => setThcDeductionDelay(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Deduction - Damage <span className="text-red-600 text-xs">(Subtraction -)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={thcDeductionDamage}
                      onChange={(e) => setThcDeductionDamage(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <div className="bg-slate-900 text-white p-4 rounded-lg">
                      <label className="block text-sm font-semibold mb-2">
                        New THC Balance Amount (Calculated)
                      </label>
                      <p className="text-2xl font-bold">
                        ₹{calculateNewBalanceAmount().toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-300 mt-2">
                        Original: ₹{thcDetails.thc_balance_amount?.toFixed(2) || '0.00'} + Unloading + Detention - Delay - Damage
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Update POD
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
