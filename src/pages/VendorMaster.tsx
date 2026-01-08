import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, Download, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddVendorModal } from '../components/modals/AddVendorModal';
import { EditVendorModal } from '../components/modals/EditVendorModal';

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
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
  vendor_type: string;
  ven_bk_branch: string | null;
  pan_document_url: string | null;
  cancelled_cheque_url: string | null;
  tds_declaration_url: string | null;
  is_active: boolean;
  created_at: string;
}

export function VendorMaster() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_master')
        .select('*')
        .order('vendor_code', { ascending: true });

      if (error) throw error;
      setVendors(data || []);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      alert('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, vendorName: string) => {
    if (!confirm(`Are you sure you want to delete "${vendorName}"?`)) return;

    try {
      const { error } = await supabase
        .from('vendor_master')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Vendor deleted successfully!');
      fetchVendors();
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      alert(error.message || 'Failed to delete vendor');
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowEditModal(true);
  };

  const handleDownloadTemplate = () => {
    const csvContent = `Vendor Code,Vendor Name,Vendor Type,Booking Branch,Vendor Address,Vendor Phone,PAN,Email ID,Account No,Bank Name,IFSC Code,TDS Applicable (Y/N),TDS Category,TDS Rate (%),Status (Active/Inactive)
VEND001,Sample Vendor Ltd,Transporter,BR001,"123 Main Street, Mumbai 400001",9876543210,ABCDE1234F,vendor@example.com,1234567890,HDFC Bank,HDFC0001234,Y,Individual,1,Active
VEND002,Another Vendor Pvt Ltd,Admin,BR002,"456 Park Road, Delhi 110001",9876543211,FGHIJ5678K,another@example.com,9876543210,ICICI Bank,ICIC0005678,Y,Corporate,2,Active
VEND003,Third Vendor,Transporter,,"789 Park Avenue, Bangalore 560001",9876543212,KLMNO9012P,third@example.com,1122334455,SBI Bank,SBIN0001122,N,,,Active`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'vendor_master_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    return values;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setUploading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').map(line => line.replace(/\r$/, ''));

      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        setUploading(false);
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const vendors = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);

        if (values.length < 15) {
          errors.push(`Line ${i + 1}: Insufficient columns (found ${values.length}, expected 15)`);
          continue;
        }

        const [
          vendor_code,
          vendor_name,
          vendor_type,
          ven_bk_branch,
          vendor_address,
          vendor_phone,
          pan,
          email_id,
          account_no,
          bank_name,
          ifsc_code,
          tds_applicable,
          tds_category,
          tds_rate,
          status
        ] = values;

        if (!vendor_code || !vendor_name || !vendor_type || !vendor_address || !vendor_phone) {
          const missing = [];
          if (!vendor_code) missing.push('Code');
          if (!vendor_name) missing.push('Name');
          if (!vendor_type) missing.push('Type');
          if (!vendor_address) missing.push('Address');
          if (!vendor_phone) missing.push('Phone');
          errors.push(`Line ${i + 1}: Missing required fields: ${missing.join(', ')}`);
          continue;
        }

        if (vendor_type !== 'Transporter' && vendor_type !== 'Admin') {
          errors.push(`Line ${i + 1}: Invalid Vendor Type '${vendor_type}' (must be 'Transporter' or 'Admin')`);
          continue;
        }

        const trimmedTdsCategory = tds_category.trim();
        if (trimmedTdsCategory && trimmedTdsCategory !== 'Individual' && trimmedTdsCategory !== 'Corporate') {
          errors.push(`Line ${i + 1}: Invalid TDS Category '${trimmedTdsCategory}' (must be 'Individual', 'Corporate', or empty)`);
          continue;
        }

        const trimmedTdsRate = tds_rate.trim();
        if (trimmedTdsRate && trimmedTdsRate !== '1' && trimmedTdsRate !== '2') {
          errors.push(`Line ${i + 1}: Invalid TDS Rate '${trimmedTdsRate}' (must be '1', '2', or empty)`);
          continue;
        }

        vendors.push({
          vendor_code,
          vendor_name,
          vendor_type,
          ven_bk_branch: ven_bk_branch.trim() || null,
          vendor_address,
          vendor_phone,
          pan: pan.trim() || null,
          email_id: email_id.trim() || '',
          account_no: account_no.trim() || '',
          bank_name: bank_name.trim() || '',
          ifsc_code: ifsc_code.trim() || null,
          tds_applicable: tds_applicable.toUpperCase() === 'Y' ? 'Y' : 'N',
          tds_category: trimmedTdsCategory || null,
          tds_rate: trimmedTdsRate ? parseFloat(trimmedTdsRate) : null,
          is_active: status.toLowerCase() === 'active'
        });
      }

      if (vendors.length === 0) {
        let errorMsg = 'No valid vendor records found in the file.';
        if (errors.length > 0) {
          errorMsg += '\n\nErrors found:\n' + errors.slice(0, 5).join('\n');
          if (errors.length > 5) {
            errorMsg += `\n... and ${errors.length - 5} more errors`;
          }
        } else {
          errorMsg += '\n\nPlease ensure:\n1. CSV has data rows (not just headers)\n2. All required fields are filled\n3. Vendor Type is exactly "Transporter" or "Admin"';
        }
        alert(errorMsg);
        setUploading(false);
        return;
      }

      const { data, error } = await supabase
        .from('vendor_master')
        .insert(vendors)
        .select();

      if (error) throw error;

      let message = `Successfully uploaded ${data.length} vendor(s)!`;
      if (errors.length > 0) {
        message += `\n\nErrors encountered:\n${errors.join('\n')}`;
      }

      alert(message);
      fetchVendors();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert(`Failed to upload vendors: ${error.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.vendor_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.vendor_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.bank_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && vendor.is_active) ||
      (statusFilter === 'inactive' && !vendor.is_active);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Master</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Vendor
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by vendor code, name, phone, or bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'inactive'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TDS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No vendors found
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {vendor.vendor_code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {vendor.vendor_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        vendor.vendor_type === 'Transporter'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {vendor.vendor_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {vendor.vendor_phone}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {vendor.bank_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {vendor.tds_applicable === 'Y' ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          vendor.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.id, vendor.vendor_name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Total Vendors: <span className="font-semibold">{filteredVendors.length}</span>
          </p>
        </div>
      </div>

      <AddVendorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchVendors}
      />

      {selectedVendor && (
        <EditVendorModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedVendor(null);
          }}
          onSuccess={fetchVendors}
          vendor={selectedVendor}
        />
      )}
    </div>
  );
}
