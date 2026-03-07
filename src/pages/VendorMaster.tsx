import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddVendorModal } from '../components/modals/AddVendorModal';
import { EditVendorModal } from '../components/modals/EditVendorModal';
import * as XLSX from 'xlsx';

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

  const handleDownloadVendorMaster = async () => {
    try {
      const { data: vendorData, error } = await supabase
        .from('vendor_master')
        .select('*')
        .order('vendor_code', { ascending: true });

      if (error) throw error;

      if (!vendorData || vendorData.length === 0) {
        alert('No vendor data available to download');
        return;
      }

      const exportData = vendorData.map(vendor => ({
        'Vendor Code': vendor.vendor_code,
        'Vendor Name': vendor.vendor_name,
        'Vendor Type': vendor.vendor_type,
        'Booking Branch': vendor.ven_bk_branch || '',
        'Vendor Address': vendor.vendor_address,
        'Vendor Phone': vendor.vendor_phone,
        'PAN': vendor.pan || '',
        'Email ID': vendor.email_id || '',
        'Account No': vendor.account_no || '',
        'Bank Name': vendor.bank_name || '',
        'IFSC Code': vendor.ifsc_code || '',
        'TDS Applicable': vendor.tds_applicable,
        'TDS Category': vendor.tds_category || '',
        'TDS Rate (%)': vendor.tds_rate || '',
        'Status': vendor.is_active ? 'Active' : 'Inactive',
        'Created At': new Date(vendor.created_at).toLocaleString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendor Master');

      const colWidths = [
        { wch: 12 }, // Vendor Code
        { wch: 30 }, // Vendor Name
        { wch: 12 }, // Vendor Type
        { wch: 15 }, // Booking Branch
        { wch: 40 }, // Vendor Address
        { wch: 15 }, // Vendor Phone
        { wch: 12 }, // PAN
        { wch: 25 }, // Email ID
        { wch: 18 }, // Account No
        { wch: 20 }, // Bank Name
        { wch: 12 }, // IFSC Code
        { wch: 15 }, // TDS Applicable
        { wch: 15 }, // TDS Category
        { wch: 12 }, // TDS Rate
        { wch: 10 }, // Status
        { wch: 20 }  // Created At
      ];
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `Vendor_Master_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error: any) {
      console.error('Error downloading vendor master:', error);
      alert('Failed to download vendor master: ' + error.message);
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
            onClick={handleDownloadVendorMaster}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download Vendor Master XLS
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
