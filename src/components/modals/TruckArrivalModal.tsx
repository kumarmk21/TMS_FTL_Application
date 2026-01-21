import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Truck, Loader2, Upload, FileText } from 'lucide-react';

interface BookingLR {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  consignor: string;
  consignee: string;
  from_city: string;
  to_city: string;
  vehicle_number: string;
  driver_name: string;
  driver_mobile: string;
  no_of_pkgs: number;
  chrg_wt: number;
  pod_upload: string;
  pod_recd_date: string;
  pod_recd_type: string;
  act_del_date: string;
  est_del_date: string;
}

interface TruckArrivalModalProps {
  booking: BookingLR;
  onClose: () => void;
  onSuccess: () => void;
}

export function TruckArrivalModal({ booking, onClose, onSuccess }: TruckArrivalModalProps) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    arrivalDate: booking.act_del_date || new Date().toISOString().split('T')[0],
    arrivalTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    remarks: '',
    uploadPOD: false,
    podReceivedDate: new Date().toISOString().split('T')[0],
    podReceivedType: 'Original',
    podCourierNumber: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxSize = 10 * 1024 * 1024;

      if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF, JPG, and PNG files are allowed');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.arrivalDate) {
      alert('Please enter truck arrival date');
      return;
    }

    if (formData.uploadPOD && !selectedFile && !booking.pod_upload) {
      alert('Please select a POD document to upload');
      return;
    }

    if (formData.uploadPOD && !formData.podReceivedDate) {
      alert('Please enter POD received date');
      return;
    }

    try {
      setSaving(true);

      let podUrl = booking.pod_upload;

      if (formData.uploadPOD && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${profile?.id}/${booking.manual_lr_no}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('pod-documents')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('pod-documents')
          .getPublicUrl(fileName);

        podUrl = urlData.publicUrl;
      }

      // Calculate SLA status
      let slaStatus = 'ON TIME';
      if (booking.est_del_date && formData.arrivalDate) {
        const estDate = new Date(booking.est_del_date);
        const actDate = new Date(formData.arrivalDate);
        estDate.setHours(0, 0, 0, 0);
        actDate.setHours(0, 0, 0, 0);

        if (actDate > estDate) {
          slaStatus = 'LATE';
        }
      }

      const updateData: any = {
        act_del_date: formData.arrivalDate,
        lr_sla_status: slaStatus,
        lr_ops_status: 'Delivered',
        lr_status: 'Delivered',
        updated_at: new Date().toISOString(),
      };

      if (formData.uploadPOD) {
        updateData.pod_upload = podUrl;
        updateData.pod_recd_date = formData.podReceivedDate;
        updateData.pod_recd_type = formData.podReceivedType;
        if (formData.podCourierNumber) {
          updateData.pod_courier_number = formData.podCourierNumber;
        }
      }

      const { error: updateError } = await supabase
        .from('booking_lr')
        .update(updateData)
        .eq('tran_id', booking.tran_id);

      if (updateError) throw updateError;

      const { error: thcUpdateError } = await supabase
        .from('thc_details')
        .update({ unloading_date: formData.arrivalDate })
        .eq('lr_no', booking.manual_lr_no);

      if (thcUpdateError) {
        console.warn('THC update error:', thcUpdateError);
      }

      alert('Truck arrival recorded successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error recording truck arrival:', error);
      alert(error.message || 'Failed to record truck arrival. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Truck Arrival</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase">LR Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">LR Number:</span>
                <span className="ml-2 font-semibold text-gray-900">{booking.manual_lr_no}</span>
              </div>
              <div>
                <span className="text-gray-600">LR Date:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {booking.lr_date ? new Date(booking.lr_date).toLocaleDateString('en-IN') : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">From:</span>
                <span className="ml-2 font-semibold text-gray-900">{booking.from_city}</span>
              </div>
              <div>
                <span className="text-gray-600">To:</span>
                <span className="ml-2 font-semibold text-gray-900">{booking.to_city}</span>
              </div>
              <div>
                <span className="text-gray-600">Vehicle:</span>
                <span className="ml-2 font-semibold text-gray-900">{booking.vehicle_number || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">Driver:</span>
                <span className="ml-2 font-semibold text-gray-900">{booking.driver_name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">Est. Delivery Date:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {booking.est_del_date ? new Date(booking.est_del_date).toLocaleDateString('en-IN') : '-'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Consignor:</span>
                <span className="ml-2 font-semibold text-gray-900">{booking.consignor}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Consignee:</span>
                <span className="ml-2 font-semibold text-gray-900">{booking.consignee}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Arrival Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arrival Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) =>
                    setFormData({ ...formData, arrivalDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arrival Time
                </label>
                <input
                  type="time"
                  value={formData.arrivalTime}
                  onChange={(e) =>
                    setFormData({ ...formData, arrivalTime: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                placeholder="Any remarks about the arrival..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={saving}
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">POD Upload (Optional)</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.uploadPOD}
                  onChange={(e) =>
                    setFormData({ ...formData, uploadPOD: e.target.checked })
                  }
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  disabled={saving}
                />
                <span className="text-sm font-medium text-gray-700">Upload POD</span>
              </label>
            </div>

            {formData.uploadPOD && (
              <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    POD Document
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-500 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pod-upload"
                      disabled={saving}
                    />
                    <label
                      htmlFor="pod-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      {selectedFile ? (
                        <>
                          <FileText className="w-12 h-12 text-green-600" />
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                          <p className="text-xs text-red-600 mt-2">Click to change file</p>
                        </>
                      ) : booking.pod_upload ? (
                        <>
                          <FileText className="w-12 h-12 text-blue-600" />
                          <p className="text-sm font-medium text-gray-900">POD already uploaded</p>
                          <a
                            href={booking.pod_upload}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View existing POD
                          </a>
                          <p className="text-xs text-gray-600 mt-2">Click to upload new file</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">
                            Click to upload POD document
                          </p>
                          <p className="text-xs text-gray-500">
                            PDF, JPG, PNG up to 10MB
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      POD Received Date
                    </label>
                    <input
                      type="date"
                      value={formData.podReceivedDate}
                      onChange={(e) =>
                        setFormData({ ...formData, podReceivedDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      POD Received Type
                    </label>
                    <select
                      value={formData.podReceivedType}
                      onChange={(e) =>
                        setFormData({ ...formData, podReceivedType: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={saving}
                    >
                      <option value="Original">Original</option>
                      <option value="Scan Copy">Scan Copy</option>
                      <option value="Photo Copy">Photo Copy</option>
                      <option value="Email">Email</option>
                      <option value="WhatsApp">WhatsApp</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Courier Number (if applicable)
                    </label>
                    <input
                      type="text"
                      value={formData.podCourierNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, podCourierNumber: e.target.value })
                      }
                      placeholder="Enter courier tracking number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Truck className="w-5 h-5" />
                Record Arrival
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
