import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Upload, Loader2, FileText, CheckCircle } from 'lucide-react';

interface BookingLR {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  consignor: string;
  consignee: string;
  from_city: string;
  to_city: string;
  pod_upload: string;
  pod_recd_date: string;
  pod_recd_type: string;
  pod_courier_number: string;
}

interface UploadPODModalProps {
  booking: BookingLR;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadPODModal({ booking, onClose, onSuccess }: UploadPODModalProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    podReceivedDate: booking.pod_recd_date || new Date().toISOString().split('T')[0],
    podReceivedType: booking.pod_recd_type || 'Original',
    podCourierNumber: booking.pod_courier_number || '',
    arrivalDate: new Date().toISOString().split('T')[0],
    actualDeliveryDate: new Date().toISOString().split('T')[0],
    markAsDelivered: true,
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

  const handleUpload = async () => {
    if (!selectedFile && !booking.pod_upload) {
      alert('Please select a POD document to upload');
      return;
    }

    if (!formData.podReceivedDate) {
      alert('Please enter POD received date');
      return;
    }

    try {
      setUploading(true);

      let podUrl = booking.pod_upload;

      if (selectedFile) {
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

      const updateData: any = {
        pod_upload: podUrl,
        pod_recd_date: formData.podReceivedDate,
        pod_recd_type: formData.podReceivedType,
        pod_courier_number: formData.podCourierNumber,
        arrival_date: formData.arrivalDate,
        updated_at: new Date().toISOString(),
      };

      if (formData.markAsDelivered) {
        updateData.lr_status = 'Delivered';
        updateData.act_del_date = formData.actualDeliveryDate;
      }

      const { error: updateError } = await supabase
        .from('booking_lr')
        .update(updateData)
        .eq('tran_id', booking.tran_id);

      if (updateError) throw updateError;

      alert('POD uploaded successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading POD:', error);
      alert(error.message || 'Failed to upload POD. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Upload POD</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={uploading}
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

          {booking.pod_upload && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">POD Already Uploaded</span>
              </div>
              <a
                href={booking.pod_upload}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:text-green-700 underline"
              >
                View existing POD document
              </a>
              <p className="text-xs text-green-700 mt-2">
                You can upload a new file to replace the existing POD
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              POD Document <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-500 transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="pod-upload"
                disabled={uploading}
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
                POD Received Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.podReceivedDate}
                onChange={(e) =>
                  setFormData({ ...formData, podReceivedDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={uploading}
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
                disabled={uploading}
              >
                <option value="Original">Original</option>
                <option value="Scan Copy">Scan Copy</option>
                <option value="Photo Copy">Photo Copy</option>
                <option value="Email">Email</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
            </div>

            <div>
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
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Truck Arrival Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.arrivalDate}
                onChange={(e) =>
                  setFormData({ ...formData, arrivalDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={uploading}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.markAsDelivered}
                onChange={(e) =>
                  setFormData({ ...formData, markAsDelivered: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                disabled={uploading}
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Mark LR as Delivered
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  This will update the LR status to "Delivered" and set the actual delivery date
                </p>
              </div>
            </label>

            {formData.markAsDelivered && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.actualDeliveryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, actualDeliveryDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={uploading}
                />
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || (!selectedFile && !booking.pod_upload)}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload POD
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
