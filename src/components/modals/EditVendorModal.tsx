import { useState, useEffect } from 'react';
import { X, Upload, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: string;
  vendor_address: string;
  vendor_phone: string;
  pan: string | null;
  email_id: string;
  account_no: string;
  bank_name: string;
  ifsc_code: string | null;
  tds_applicable: string;
  tds_category: string | null;
  tds_rate: number | null;
  ven_bk_branch: string | null;
  pan_document_url: string | null;
  cancelled_cheque_url: string | null;
  tds_declaration_url: string | null;
  is_active: boolean;
}

interface Branch {
  branch_code: string;
  branch_name: string;
}

interface EditVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendor: Vendor;
}

export function EditVendorModal({ isOpen, onClose, onSuccess, vendor }: EditVendorModalProps) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState({
    vendor_name: vendor.vendor_name,
    vendor_type: vendor.vendor_type,
    vendor_address: vendor.vendor_address,
    vendor_phone: vendor.vendor_phone,
    pan: vendor.pan || '',
    email_id: vendor.email_id,
    account_no: vendor.account_no,
    bank_name: vendor.bank_name,
    ifsc_code: vendor.ifsc_code || '',
    tds_applicable: vendor.tds_applicable,
    tds_category: vendor.tds_category || '',
    ven_bk_branch: vendor.ven_bk_branch || '',
    is_active: vendor.is_active,
  });

  const [files, setFiles] = useState({
    pan_document: null as File | null,
    cancelled_cheque: null as File | null,
    tds_declaration: null as File | null,
  });

  const [existingFiles, setExistingFiles] = useState({
    pan_document_url: vendor.pan_document_url,
    cancelled_cheque_url: vendor.cancelled_cheque_url,
    tds_declaration_url: vendor.tds_declaration_url,
  });

  useEffect(() => {
    if (isOpen) {
      fetchBranches();
    }
  }, [isOpen]);

  useEffect(() => {
    setFormData({
      vendor_name: vendor.vendor_name,
      vendor_type: vendor.vendor_type,
      vendor_address: vendor.vendor_address,
      vendor_phone: vendor.vendor_phone,
      pan: vendor.pan || '',
      email_id: vendor.email_id,
      account_no: vendor.account_no,
      bank_name: vendor.bank_name,
      ifsc_code: vendor.ifsc_code || '',
      tds_applicable: vendor.tds_applicable,
      tds_category: vendor.tds_category || '',
      ven_bk_branch: vendor.ven_bk_branch || '',
      is_active: vendor.is_active,
    });
    setExistingFiles({
      pan_document_url: vendor.pan_document_url,
      cancelled_cheque_url: vendor.cancelled_cheque_url,
      tds_declaration_url: vendor.tds_declaration_url,
    });
  }, [vendor]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_master')
        .select('branch_code, branch_name')
        .eq('is_active', true)
        .order('branch_name', { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));

      if (name === 'tds_applicable' && value === 'N') {
        setFormData((prev) => ({ ...prev, tds_category: '' }));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: keyof typeof files) => {
    if (e.target.files && e.target.files[0]) {
      setFiles((prev) => ({ ...prev, [fileType]: e.target.files![0] }));
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendor_name.trim()) {
      alert('Vendor name is required');
      return;
    }
    if (!formData.vendor_type) {
      alert('Vendor type is required');
      return;
    }
    if (!formData.vendor_address.trim()) {
      alert('Vendor address is required');
      return;
    }
    if (!formData.vendor_phone.trim()) {
      alert('Vendor phone is required');
      return;
    }
    if (!formData.account_no.trim()) {
      alert('Account number is required');
      return;
    }
    if (!formData.bank_name.trim()) {
      alert('Bank name is required');
      return;
    }
    if (formData.pan && formData.pan.length !== 10) {
      alert('PAN must be exactly 10 characters');
      return;
    }
    if (formData.ifsc_code && formData.ifsc_code.length !== 11) {
      alert('IFSC code must be exactly 11 characters');
      return;
    }
    if (formData.ifsc_code && formData.ifsc_code[4] !== '0') {
      alert('5th character of IFSC code must be 0');
      return;
    }
    if (formData.tds_applicable === 'Y' && !formData.tds_category) {
      alert('TDS category is required when TDS is applicable');
      return;
    }

    setLoading(true);

    try {
      let pan_document_url = existingFiles.pan_document_url;
      let cancelled_cheque_url = existingFiles.cancelled_cheque_url;
      let tds_declaration_url = existingFiles.tds_declaration_url;

      if (files.pan_document) {
        pan_document_url = await uploadFile(files.pan_document, 'pan');
      }
      if (files.cancelled_cheque) {
        cancelled_cheque_url = await uploadFile(files.cancelled_cheque, 'cheque');
      }
      if (files.tds_declaration) {
        tds_declaration_url = await uploadFile(files.tds_declaration, 'tds');
      }

      const tds_rate = formData.tds_applicable === 'Y'
        ? (formData.tds_category === 'Individual' ? 1 : 2)
        : null;

      const { error } = await supabase
        .from('vendor_master')
        .update({
          vendor_name: formData.vendor_name,
          vendor_type: formData.vendor_type,
          vendor_address: formData.vendor_address,
          vendor_phone: formData.vendor_phone,
          pan: formData.pan || null,
          email_id: formData.email_id || 'info@dlslogistics.in',
          account_no: formData.account_no,
          bank_name: formData.bank_name,
          ifsc_code: formData.ifsc_code || null,
          tds_applicable: formData.tds_applicable,
          tds_category: formData.tds_applicable === 'Y' ? formData.tds_category : null,
          tds_rate,
          ven_bk_branch: formData.ven_bk_branch || null,
          pan_document_url,
          cancelled_cheque_url,
          tds_declaration_url,
          is_active: formData.is_active,
        })
        .eq('id', vendor.id);

      if (error) throw error;

      alert('Vendor updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      alert(error.message || 'Failed to update vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Vendor</h2>
            <p className="text-sm text-gray-500">Vendor Code: {vendor.vendor_code}</p>
          </div>
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
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor Type <span className="text-red-500">*</span>
              </label>
              <select
                name="vendor_type"
                value={formData.vendor_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="Transporter">Transporter</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking Branch
              </label>
              <select
                name="ven_bk_branch"
                value={formData.ven_bk_branch}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.branch_code} value={branch.branch_code}>
                    {branch.branch_name} ({branch.branch_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="vendor_phone"
                value={formData.vendor_phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="vendor_address"
                value={formData.vendor_address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PAN (10 characters)
              </label>
              <input
                type="text"
                name="pan"
                value={formData.pan}
                onChange={handleInputChange}
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email ID
              </label>
              <input
                type="email"
                name="email_id"
                value={formData.email_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="account_no"
                value={formData.account_no}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IFSC Code (11 characters)
              </label>
              <input
                type="text"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleInputChange}
                maxLength={11}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TDS Applicable
              </label>
              <select
                name="tds_applicable"
                value={formData.tds_applicable}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="N">No</option>
                <option value="Y">Yes</option>
              </select>
            </div>

            {formData.tds_applicable === 'Y' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TDS Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="tds_category"
                  value={formData.tds_category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required={formData.tds_applicable === 'Y'}
                >
                  <option value="">Select Category</option>
                  <option value="Individual">Individual (Rate: 1%)</option>
                  <option value="Corporate">Corporate (Rate: 2%)</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900">Document Uploads</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PAN Document
                </label>
                {existingFiles.pan_document_url && (
                  <a
                    href={existingFiles.pan_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Current
                  </a>
                )}
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(e, 'pan_document')}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="pan_document_edit"
                  />
                  <label
                    htmlFor="pan_document_edit"
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {files.pan_document ? files.pan_document.name : 'Replace File'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cancelled Cheque
                </label>
                {existingFiles.cancelled_cheque_url && (
                  <a
                    href={existingFiles.cancelled_cheque_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Current
                  </a>
                )}
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(e, 'cancelled_cheque')}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="cancelled_cheque_edit"
                  />
                  <label
                    htmlFor="cancelled_cheque_edit"
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {files.cancelled_cheque ? files.cancelled_cheque.name : 'Replace File'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TDS Declaration
                </label>
                {existingFiles.tds_declaration_url && (
                  <a
                    href={existingFiles.tds_declaration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Current
                  </a>
                )}
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(e, 'tds_declaration')}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="tds_declaration_edit"
                  />
                  <label
                    htmlFor="tds_declaration_edit"
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {files.tds_declaration ? files.tds_declaration.name : 'Replace File'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>

            <div className="flex gap-3">
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Vendor'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
