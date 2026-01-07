import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, Download, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddCustomerModal } from '../components/modals/AddCustomerModal';
import { EditCustomerModal } from '../components/modals/EditCustomerModal';

interface Customer {
  id: string;
  customer_id: string;
  customer_name: string;
  is_active: boolean;
  group_id: string | null;
  sales_person: string | null;
  gstin: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  lr_mail_id: string | null;
  customer_contact: string | null;
  contract_type: string | null;
  credit_days: number | null;
  created_at: string;
}

export function CustomerMaster() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_master')
        .select('*')
        .order('customer_id', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      alert('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (!confirm(`Are you sure you want to delete "${customerName}"?`)) return;

    try {
      const { error } = await supabase
        .from('customer_master')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Customer deleted successfully!');
      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      alert(error.message || 'Failed to delete customer');
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  };

  const downloadTemplate = () => {
    const headers = [
      'customer_id',
      'customer_name',
      'group_id',
      'sales_person',
      'gstin',
      'customer_address',
      'customer_city',
      'customer_state',
      'customer_phone',
      'customer_email',
      'lr_mail_id',
      'customer_contact',
      'contract_type',
      'credit_days',
      'is_active'
    ];

    const sampleRow = [
      'CUST001',
      'Sample Customer Name',
      'GROUP01',
      'John Doe',
      '29ABCDE1234F1Z5',
      '123 Main Street Area Name City',
      'Mumbai',
      'Maharashtra',
      '9876543210',
      'customer@example.com',
      'lr@example.com',
      'Contact Person Name',
      'Regular',
      '30',
      'TRUE'
    ];

    const escapeCSVField = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = [
      headers.join(','),
      sampleRow.map(escapeCSVField).join(','),
      ''
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'customer_import_template.csv');
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
      const rawHeaders = allRows[0];
      const rows = allRows.slice(1);

      const columnMapping: { [key: string]: string } = {
        'Customer_ID': 'customer_id',
        'Customer_Name': 'customer_name',
        'Group_ID': 'group_id',
        'Sales_Person': 'sales_person',
        'GSTIN': 'gstin',
        'Customer_Address': 'customer_address',
        'Customer_City': 'customer_city',
        'Customer_State': 'customer_state',
        'Customer_Phone': 'customer_phone',
        'Customer_Email': 'customer_email',
        'lrmailid': 'lr_mail_id',
        'Customer_Contact': 'customer_contact',
        'Customer_Contract_Type': 'contract_type',
        'Customer_Credit_Days': 'credit_days',
        'Customer_Active': 'is_active'
      };

      const headers = rawHeaders.map(h => {
        const normalized = columnMapping[h] || h.toLowerCase().replace(/_/g, '_');
        return normalized;
      });

      const requiredFields = ['customer_id', 'customer_name'];
      const hasRequired = requiredFields.every(field => headers.includes(field));

      if (!hasRequired) {
        setUploadStatus('error');
        setUploadProgress(`Missing required columns. Please ensure your CSV has either 'Customer_ID' and 'Customer_Name' or 'customer_id' and 'customer_name'`);
        setTimeout(() => setUploadStatus('idle'), 3000);
        setUploading(false);
        return;
      }

      setUploadProgress(`Parsing ${rows.length} rows...`);
      const customerData: any[] = [];
      const parseErrors: string[] = [];

      for (let index = 0; index < rows.length; index++) {
        const values = rows[index];
        const customer: any = {};

        if (values.length !== headers.length) {
          parseErrors.push(`Row ${index + 2}: Expected ${headers.length} columns but found ${values.length}. Check for extra commas or missing fields.`);
          continue;
        }

        try {
          headers.forEach((header, i) => {
            const value = (values[i] || '').trim();

            if (header === 'is_active') {
              const lowerValue = value.toLowerCase();
              customer[header] = lowerValue === 'true' || lowerValue === 'active';
            } else if (header === 'credit_days') {
              if (value) {
                const parsed = parseInt(value);
                if (isNaN(parsed)) {
                  throw new Error(`Invalid credit_days value "${value}". Must be a number.`);
                }
                if (parsed < 0 || parsed > 999) {
                  throw new Error(`Invalid credit_days value "${value}". Must be between 0 and 999.`);
                }
                customer[header] = parsed;
              } else {
                customer[header] = null;
              }
            } else if (header === 'date_added' || header === 'createdby') {
              // Skip these columns as they're not in our schema
            } else {
              customer[header] = value || null;
            }
          });

          if (customer.is_active === undefined || customer.is_active === null) {
            customer.is_active = true;
          }

          if (customer.customer_id && customer.customer_name) {
            customerData.push(customer);
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

      if (customerData.length === 0) {
        setUploadStatus('error');
        setUploadProgress('No valid customer records found in the CSV file');
        setTimeout(() => setUploadStatus('idle'), 3000);
        setUploading(false);
        return;
      }

      setUploadProgress('Checking for duplicate customer IDs...');
      const { data: existingCustomers } = await supabase
        .from('customer_master')
        .select('customer_id');

      const existingIds = new Set(existingCustomers?.map(c => c.customer_id) || []);

      const newCustomers = customerData.filter(c => !existingIds.has(c.customer_id));
      const duplicates = customerData.filter(c => existingIds.has(c.customer_id));

      if (duplicates.length > 0) {
        setUploadProgress(`Found ${duplicates.length} duplicates, ${newCustomers.length} new customers`);
        const proceed = confirm(
          `Found ${duplicates.length} duplicate customer IDs that will be skipped.\n` +
          `${newCustomers.length} new customers will be imported.\n\n` +
          `Do you want to continue?`
        );

        if (!proceed) {
          setUploadStatus('idle');
          setUploadProgress('');
          setUploading(false);
          return;
        }
      }

      if (newCustomers.length === 0) {
        setUploadStatus('error');
        setUploadProgress('All customer IDs already exist. No new customers to import.');
        setTimeout(() => setUploadStatus('idle'), 3000);
        setUploading(false);
        return;
      }

      setUploadProgress(`Importing ${newCustomers.length} customers...`);
      const { error } = await supabase
        .from('customer_master')
        .insert(newCustomers);

      if (error) throw error;

      setUploadStatus('success');
      setUploadProgress(
        `Successfully imported ${newCustomers.length} customers!` +
        (duplicates.length > 0 ? ` (${duplicates.length} duplicates skipped)` : '')
      );

      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress('');
      }, 5000);

      fetchCustomers();
    } catch (error: any) {
      console.error('Error uploading customers:', error);
      setUploadStatus('error');
      setUploadProgress(`Failed to upload customers: ${error.message}`);
      setTimeout(() => setUploadStatus('idle'), 5000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && customer.is_active) ||
      (statusFilter === 'inactive' && !customer.is_active);

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
        <h1 className="text-2xl font-bold text-gray-900">Customer Master</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadTemplate}
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
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </div>

      {uploadStatus !== 'idle' && (
        <div
          className={`flex items-start gap-3 p-4 rounded-lg border ${
            uploadStatus === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : uploadStatus === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {uploadStatus === 'processing' && (
            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0 mt-0.5" />
          )}
          {uploadStatus === 'success' && (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          {uploadStatus === 'error' && (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium whitespace-pre-wrap break-words">{uploadProgress}</p>
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
                placeholder="Search by customer ID, name, city, or phone..."
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
                  Customer ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
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
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {customer.customer_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {customer.customer_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {customer.customer_city || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {customer.customer_phone || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {customer.customer_email || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id, customer.customer_name)}
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
            Total Customers: <span className="font-semibold">{filteredCustomers.length}</span>
          </p>
        </div>
      </div>

      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchCustomers}
      />

      {selectedCustomer && (
        <EditCustomerModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={fetchCustomers}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
}
