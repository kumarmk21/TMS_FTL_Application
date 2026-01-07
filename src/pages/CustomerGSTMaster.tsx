import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, Upload, Download, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddCustomerGSTModal } from '../components/modals/AddCustomerGSTModal';
import { EditCustomerGSTModal } from '../components/modals/EditCustomerGSTModal';

interface CustomerGST {
  id: string;
  customer_code: string;
  customer_name: string;
  gstin: string | null;
  bill_to_address: string;
  state_id: string | null;
  state_code: string | null;
  alpha_code: string | null;
  is_active: boolean;
  created_at: string;
}

interface CustomerGSTWithState extends CustomerGST {
  state_master?: {
    state_name: string;
  };
}

export function CustomerGSTMaster() {
  const [customerGSTs, setCustomerGSTs] = useState<CustomerGSTWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomerGST, setSelectedCustomerGST] = useState<CustomerGSTWithState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCustomerGSTs();
  }, []);

  const downloadTemplate = () => {
    const headers = [
      'customer_code',
      'customer_name',
      'gstin',
      'bill_to_address',
      'state_name',
      'state_code',
      'alpha_code',
      'is_active'
    ];

    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'customer_gst_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    const chars = text.split('');
    let current = '';
    let currentRow: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const nextChar = chars[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(current.trim());
        current = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        if (current || currentRow.length > 0) {
          currentRow.push(current.trim());
          if (currentRow.some(cell => cell.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          current = '';
        }
      } else if (char !== '\r') {
        current += char;
      }
    }

    if (current || currentRow.length > 0) {
      currentRow.push(current.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setUploadProgress('Please upload a CSV file');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    setUploading(true);
    setUploadStatus('processing');
    setUploadProgress('Reading CSV file...');

    try {
      const text = await file.text();
      const allRows = parseCSV(text);

      if (allRows.length < 2) {
        setUploadStatus('error');
        setUploadProgress('CSV file is empty or has no data rows');
        setTimeout(() => setUploadStatus('idle'), 3000);
        setUploading(false);
        return;
      }

      setUploadProgress('Validating CSV structure...');
      const headers = allRows[0].map(h => h.toLowerCase().trim());
      const rows = allRows.slice(1);

      const requiredFields = ['customer_code', 'customer_name', 'bill_to_address'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));

      if (missingFields.length > 0) {
        setUploadStatus('error');
        setUploadProgress(`Missing required columns: ${missingFields.join(', ')}`);
        setTimeout(() => setUploadStatus('idle'), 3000);
        setUploading(false);
        return;
      }

      setUploadProgress('Fetching state master data...');
      const { data: statesData, error: statesError } = await supabase
        .from('state_master')
        .select('id, state_name, state_code, alpha_code');

      if (statesError) {
        setUploadStatus('error');
        setUploadProgress('Failed to fetch state master data');
        setTimeout(() => setUploadStatus('idle'), 3000);
        setUploading(false);
        return;
      }

      const stateMap = new Map();
      statesData?.forEach(state => {
        const normalizedName = state.state_name.toLowerCase().trim();
        const normalizedCode = state.state_code?.toLowerCase().trim();
        const normalizedAlpha = state.alpha_code?.toLowerCase().trim();

        stateMap.set(normalizedName, state.id);
        if (normalizedCode) stateMap.set(normalizedCode, state.id);
        if (normalizedAlpha) stateMap.set(normalizedAlpha, state.id);
      });

      setUploadProgress(`Parsing ${rows.length} rows...`);
      const gstData: any[] = [];
      const parseErrors: string[] = [];

      for (let index = 0; index < rows.length; index++) {
        const values = rows[index];
        const gstRecord: any = {};

        if (values.length !== headers.length) {
          parseErrors.push(`Row ${index + 2}: Expected ${headers.length} columns but found ${values.length}. Check for extra commas or missing fields.`);
          continue;
        }

        try {
          let stateName = '';

          headers.forEach((header, i) => {
            const value = (values[i] || '').trim();

            if (header === 'is_active') {
              const lowerValue = value.toLowerCase();
              gstRecord[header] = lowerValue === 'true' || lowerValue === 'active';
            } else if (header === 'state_name') {
              stateName = value;
            } else {
              gstRecord[header] = value || null;
            }
          });

          if (stateName) {
            const normalizedStateName = stateName.toLowerCase().trim();
            const stateId = stateMap.get(normalizedStateName);

            if (stateId) {
              gstRecord.state_id = stateId;
            } else {
              parseErrors.push(`Row ${index + 2}: State "${stateName}" not found in state master`);
              continue;
            }
          }

          if (gstRecord.is_active === undefined || gstRecord.is_active === null) {
            gstRecord.is_active = true;
          }

          if (gstRecord.customer_code && gstRecord.customer_name && gstRecord.bill_to_address) {
            gstData.push(gstRecord);
          }
        } catch (error: any) {
          parseErrors.push(`Row ${index + 2}: ${error.message}`);
        }
      }

      if (parseErrors.length > 0) {
        const errorMessage = `Found ${parseErrors.length} error(s) in CSV:\n\n${parseErrors.slice(0, 5).join('\n')}${parseErrors.length > 5 ? `\n\n...and ${parseErrors.length - 5} more errors` : ''}`;
        setUploadStatus('error');
        setUploadProgress(errorMessage);
        setTimeout(() => setUploadStatus('idle'), 10000);
        setUploading(false);
        return;
      }

      if (gstData.length === 0) {
        setUploadStatus('error');
        setUploadProgress('No valid GST records found in the CSV file');
        setTimeout(() => setUploadStatus('idle'), 3000);
        setUploading(false);
        return;
      }

      setUploadProgress('Checking for duplicate customer codes...');
      const { data: existingGSTs } = await supabase
        .from('customer_gst_master')
        .select('customer_code');

      const existingCodes = new Set(existingGSTs?.map(g => g.customer_code) || []);

      const newGSTs = gstData.filter(g => !existingCodes.has(g.customer_code));
      const duplicates = gstData.filter(g => existingCodes.has(g.customer_code));

      if (duplicates.length > 0) {
        setUploadProgress(`Found ${duplicates.length} duplicates, ${newGSTs.length} new records`);
        const proceed = confirm(
          `Found ${duplicates.length} duplicate customer codes that will be skipped.\n` +
          `${newGSTs.length} new GST records will be imported.\n\n` +
          `Do you want to continue?`
        );

        if (!proceed) {
          setUploadStatus('idle');
          setUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      }

      if (newGSTs.length === 0) {
        setUploadStatus('error');
        setUploadProgress('All records already exist in the database');
        setTimeout(() => setUploadStatus('idle'), 3000);
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setUploadProgress(`Importing ${newGSTs.length} GST records...`);
      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < newGSTs.length; i += batchSize) {
        const batch = newGSTs.slice(i, i + batchSize);
        const { error } = await supabase
          .from('customer_gst_master')
          .insert(batch);

        if (error) throw error;
        imported += batch.length;
        setUploadProgress(`Imported ${imported} of ${newGSTs.length} records...`);
      }

      setUploadStatus('success');
      setUploadProgress(`Successfully imported ${imported} GST records!`);
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress('');
      }, 3000);

      fetchCustomerGSTs();
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      setUploadStatus('error');
      setUploadProgress(error.message || 'Failed to upload CSV file');
      setTimeout(() => setUploadStatus('idle'), 5000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fetchCustomerGSTs = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_gst_master')
        .select(`
          *,
          state_master (
            state_name
          )
        `)
        .order('customer_code', { ascending: true });

      if (error) throw error;
      setCustomerGSTs(data || []);
    } catch (error: any) {
      console.error('Error fetching customer GST records:', error);
      alert('Failed to fetch customer GST records');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (!confirm(`Are you sure you want to delete GST record for "${customerName}"?`)) return;

    try {
      const { error } = await supabase
        .from('customer_gst_master')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Customer GST record deleted successfully!');
      fetchCustomerGSTs();
    } catch (error: any) {
      console.error('Error deleting customer GST record:', error);
      alert(error.message || 'Failed to delete customer GST record');
    }
  };

  const handleEdit = (customerGST: CustomerGSTWithState) => {
    setSelectedCustomerGST(customerGST);
    setShowEditModal(true);
  };

  const filteredCustomerGSTs = customerGSTs.filter((customerGST) => {
    const matchesSearch =
      customerGST.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerGST.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerGST.gstin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerGST.bill_to_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerGST.state_master?.state_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && customerGST.is_active) ||
      (statusFilter === 'inactive' && !customerGST.is_active);

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
        <h1 className="text-2xl font-bold text-gray-900">Customer GST Master</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download Template
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            Upload CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Customer GST
          </button>
        </div>
      </div>

      {uploadStatus !== 'idle' && (
        <div className={`p-4 rounded-lg border ${
          uploadStatus === 'success' ? 'bg-green-50 border-green-200' :
          uploadStatus === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            {uploadStatus === 'processing' && <Loader className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />}
            {uploadStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
            {uploadStatus === 'error' && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                uploadStatus === 'success' ? 'text-green-900' :
                uploadStatus === 'error' ? 'text-red-900' :
                'text-blue-900'
              }`}>
                {uploadStatus === 'processing' && 'Processing...'}
                {uploadStatus === 'success' && 'Upload Complete'}
                {uploadStatus === 'error' && 'Upload Failed'}
              </p>
              <p className={`text-sm mt-1 whitespace-pre-wrap ${
                uploadStatus === 'success' ? 'text-green-700' :
                uploadStatus === 'error' ? 'text-red-700' :
                'text-blue-700'
              }`}>
                {uploadProgress}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by customer code, name, address, or state..."
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
                  Customer Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GSTIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill To Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alpha Code
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
              {filteredCustomerGSTs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm
                      ? 'No customer GST records found matching your search.'
                      : 'No customer GST records found. Click "Add Customer GST" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredCustomerGSTs.map((customerGST) => (
                  <tr key={customerGST.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customerGST.customer_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customerGST.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customerGST.gstin || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {customerGST.bill_to_address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customerGST.state_master?.state_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customerGST.state_code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customerGST.alpha_code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customerGST.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {customerGST.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(customerGST)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customerGST.id, customerGST.customer_name)}
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
          <div className="text-sm text-gray-600">
            Showing {filteredCustomerGSTs.length} of {customerGSTs.length} customer GST records
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddCustomerGSTModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCustomerGSTs();
          }}
        />
      )}

      {showEditModal && selectedCustomerGST && (
        <EditCustomerGSTModal
          customerGST={selectedCustomerGST}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomerGST(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedCustomerGST(null);
            fetchCustomerGSTs();
          }}
        />
      )}
    </div>
  );
}
