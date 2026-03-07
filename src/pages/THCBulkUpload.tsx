import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface UploadResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

export default function THCBulkUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const downloadTemplate = () => {
    const template = [
      {
        'THC ID Number': 'OLD-THC-001',
        'THC Date': '2025-01-15',
        'THC Entry Date': '2025-01-15',
        'LR Number': 'LR2526-000001',
        'Vendor Name': 'ABC Transport',
        'Vehicle Number': 'MH01AB1234',
        'Driver Mobile': '9876543210',
        'Origin': 'Mumbai',
        'Destination': 'Delhi',
        'Vehicle Type': '32 FT MXL',
        'THC Gross Amount': '50000',
        'THC Amount': '48000',
        'Loading Charges': '1000',
        'Unloading Charges': '1000',
        'Detention Charges': '0',
        'Other Charges': '0',
        'Deduction Delay': '500',
        'Deduction Damage': '0',
        'Munshiyana Amount': '1000',
        'POD Delay Deduction': '0',
        'TDS Amount': '0',
        'Net Payable Amount': '46500',
        'Advance Amount': '25000',
        'Advance Date': '2025-01-16',
        'Advance UTR Number': 'UTR202501160001',
        'Balance Amount': '21500',
        'Balance Payment Date': '2025-01-25',
        'Balance UTR Details': 'UTR202501250001',
        'ATH Date': '2025-01-16',
        'BTH Due Date': '2025-01-30',
        'Unloading Date': '2025-01-20',
        'Current Location': 'Delhi Hub',
        'FT Trip ID': '',
        'THC Status Operations': 'Delivered',
        'THC Status Finance': 'ATH Uploaded',
        'Account Name': 'ABC Transport Pvt Ltd',
        'Account Number': '1234567890',
        'Account IFSC': 'HDFC0001234',
        'Account Bank': 'HDFC Bank',
        'Account Branch': 'Mumbai Main'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'THC Template');

    const colWidths = [
      { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 25 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 },
      { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
      { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 22 },
      { wch: 15 }, { wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 15 },
      { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 18 },
      { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'THC_Bulk_Upload_Template.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const parseExcelDate = (value: any): string | null => {
    if (!value) return null;

    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }

    return null;
  };

  const processUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ row: number; error: string; data?: any }> = [];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        const rowNumber = i + 2;

        try {
          let vendorId = null;
          if (row['Vendor Name']) {
            const { data: vendorData, error: vendorError } = await supabase
              .from('vendor_master')
              .select('id')
              .ilike('vendor_name', row['Vendor Name'].toString().trim())
              .maybeSingle();

            if (vendorError) throw new Error(`Vendor lookup failed: ${vendorError.message}`);
            if (!vendorData) throw new Error(`Vendor not found: ${row['Vendor Name']}`);
            vendorId = vendorData.id;
          }

          let lrId = null;

          let thcStatusOpsId = null;
          if (row['THC Status Operations']) {
            const { data: statusData, error: statusError } = await supabase
              .from('status_master')
              .select('id')
              .ilike('status_name', row['THC Status Operations'].toString().trim())
              .maybeSingle();

            if (statusError) throw new Error(`Operations status lookup failed: ${statusError.message}`);
            if (statusData) {
              thcStatusOpsId = statusData.id;
            }
          }

          let thcStatusFinId = null;
          if (row['THC Status Finance']) {
            const { data: statusData, error: statusError } = await supabase
              .from('status_master')
              .select('id')
              .ilike('status_name', row['THC Status Finance'].toString().trim())
              .maybeSingle();

            if (statusError) throw new Error(`Finance status lookup failed: ${statusError.message}`);
            if (statusData) {
              thcStatusFinId = statusData.id;
            }
          }

          const thcRecord = {
            thc_id_number: row['THC ID Number']?.toString().trim() || null,
            thc_date: parseExcelDate(row['THC Date']),
            thc_entry_date: parseExcelDate(row['THC Entry Date']),
            tran_id: lrId,
            lr_number: row['LR Number']?.toString().trim() || null,
            thc_vendor: vendorId,
            vehicle_number: row['Vehicle Number']?.toString().trim() || null,
            driver_number: row['Driver Mobile']?.toString().trim() || null,
            origin: row['Origin']?.toString().trim() || null,
            destination: row['Destination']?.toString().trim() || null,
            vehicle_type: row['Vehicle Type']?.toString().trim() || null,
            thc_gross_amount: row['THC Gross Amount'] ? parseFloat(row['THC Gross Amount'].toString()) : 0,
            thc_amount: row['THC Amount'] ? parseFloat(row['THC Amount'].toString()) : 0,
            thc_loading_charges: row['Loading Charges'] ? parseFloat(row['Loading Charges'].toString()) : 0,
            thc_unloading_charges: row['Unloading Charges'] ? parseFloat(row['Unloading Charges'].toString()) : 0,
            thc_detention_charges: row['Detention Charges'] ? parseFloat(row['Detention Charges'].toString()) : 0,
            thc_other_charges: row['Other Charges'] ? parseFloat(row['Other Charges'].toString()) : 0,
            thc_deduction_delay: row['Deduction Delay'] ? parseFloat(row['Deduction Delay'].toString()) : 0,
            thc_deduction_damage: row['Deduction Damage'] ? parseFloat(row['Deduction Damage'].toString()) : 0,
            thc_munshiyana_amount: row['Munshiyana Amount'] ? parseFloat(row['Munshiyana Amount'].toString()) : 0,
            thc_pod_delay_deduction: row['POD Delay Deduction'] ? parseFloat(row['POD Delay Deduction'].toString()) : 0,
            thc_tds_amount: row['TDS Amount'] ? parseFloat(row['TDS Amount'].toString()) : 0,
            thc_net_payable_amount: row['Net Payable Amount'] ? parseFloat(row['Net Payable Amount'].toString()) : 0,
            thc_advance_amount: row['Advance Amount'] ? parseFloat(row['Advance Amount'].toString()) : 0,
            thc_advance_date: parseExcelDate(row['Advance Date']),
            thc_advance_utr_number: row['Advance UTR Number']?.toString().trim() || null,
            thc_balance_amount: row['Balance Amount'] ? parseFloat(row['Balance Amount'].toString()) : 0,
            thc_balance_payment_date: parseExcelDate(row['Balance Payment Date']),
            thc_balance_pmt_utr_details: row['Balance UTR Details']?.toString().trim() || null,
            ath_date: parseExcelDate(row['ATH Date']),
            bth_due_date: parseExcelDate(row['BTH Due Date']),
            unloading_date: parseExcelDate(row['Unloading Date']),
            current_location: row['Current Location']?.toString().trim() || null,
            ft_trip_id: row['FT Trip ID']?.toString().trim() || null,
            thc_status_ops: thcStatusOpsId,
            thc_status_fin: thcStatusFinId,
            ven_act_name: row['Account Name']?.toString().trim() || null,
            ven_act_number: row['Account Number']?.toString().trim() || null,
            ven_act_ifsc: row['Account IFSC']?.toString().trim() || null,
            ven_act_bank: row['Account Bank']?.toString().trim() || null,
            ven_act_branch: row['Account Branch']?.toString().trim() || null,
            created_by: user.id
          };

          const { error: insertError } = await supabase
            .from('thc_details')
            .insert(thcRecord);

          if (insertError) {
            throw insertError;
          }

          successCount++;
        } catch (error: any) {
          failedCount++;
          errors.push({
            row: rowNumber,
            error: error.message || 'Unknown error',
            data: row
          });
        }
      }

      setResult({
        success: successCount,
        failed: failedCount,
        errors
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setResult({
        success: 0,
        failed: 0,
        errors: [{ row: 0, error: `Upload failed: ${error.message}` }]
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">THC Bulk Upload</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download the template file below</li>
                  <li>Fill in your old THC records with different nomenclatures</li>
                  <li>Ensure vendor names match existing vendors in the system</li>
                  <li>LR Number is for reference only - old THCs won't be linked to LRs</li>
                  <li>All financial amounts should be numeric values</li>
                  <li>Dates should be in YYYY-MM-DD format or Excel date format</li>
                  <li>Upload the completed file using the upload button below</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Template
            </button>

            <div className="flex-1">
              <label className="flex items-center justify-center gap-3 px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                <FileSpreadsheet className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {file ? file.name : 'Choose Excel file to upload'}
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={processUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload THC Records
                </>
              )}
            </button>
          </div>

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Successful</p>
                      <p className="text-2xl font-bold text-green-900">{result.success}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-600" />
                    <div>
                      <p className="text-sm text-red-600 font-medium">Failed</p>
                      <p className="text-2xl font-bold text-red-900">{result.failed}</p>
                    </div>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-900 mb-3">Error Details</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <div key={index} className="bg-white rounded p-3 text-sm">
                        <p className="font-medium text-red-900">
                          Row {error.row}: {error.error}
                        </p>
                        {error.data && (
                          <p className="text-gray-600 mt-1 text-xs">
                            THC ID: {error.data['THC ID Number'] || 'N/A'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Field Descriptions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Required Fields</h3>
            <ul className="space-y-1 text-gray-600">
              <li><span className="font-medium">THC ID Number:</span> Old THC identifier (any format)</li>
              <li><span className="font-medium">Vendor Name:</span> Must match existing vendor</li>
              <li><span className="font-medium">Vehicle Number:</span> Vehicle registration</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Optional Fields</h3>
            <ul className="space-y-1 text-gray-600">
              <li><span className="font-medium">LR Number:</span> For reference only (not linked)</li>
              <li><span className="font-medium">FT Trip ID:</span> FreightTiger trip reference</li>
              <li><span className="font-medium">All Financial Fields:</span> Default to 0 if blank</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
