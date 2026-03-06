import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface UploadResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

export default function LRBulkUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const downloadTemplate = () => {
    const template = [
      {
        'LR Number': 'LR2526-000001',
        'LR Date': '2026-03-06',
        'Branch Code': 'BRANCH001',
        'Origin City': 'Mumbai',
        'Destination City': 'Delhi',
        'Consignor Name': 'ABC Company',
        'Consignor Address': '123 Street, Mumbai',
        'Consignor GSTIN': '27AAAAA1234A1Z5',
        'Consignee Name': 'XYZ Company',
        'Consignee Address': '456 Road, Delhi',
        'Consignee GSTIN': '07BBBBB5678B1Z5',
        'Billing Party Name': 'ABC Company',
        'Billing Party GSTIN': '27AAAAA1234A1Z5',
        'Vehicle Number': 'MH01AB1234',
        'Driver Name': 'John Doe',
        'Driver Mobile': '9876543210',
        'Pay Basis': 'To Pay',
        'Load Type': 'Full Truck Load',
        'Material Description': 'Electronic Goods',
        'Quantity': '100',
        'Unit': 'Boxes',
        'Weight (kg)': '5000',
        'EDD (Estimated Delivery Date)': '2026-03-10',
        'Freight Amount': '25000',
        'Advance Amount': '10000',
        'Balance Amount': '15000',
        'E-way Bill No': 'EWB123456789012',
        'E-way Bill Valid Till': '2026-03-08',
        'Invoice Number': 'INV-2026-001',
        'Invoice Date': '2026-03-05',
        'Invoice Value': '500000',
        'Remarks': 'Handle with care'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LR Template');

    const colWidths = [
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 30 },
      { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 20 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'LR_Bulk_Upload_Template.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const processUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ row: number; error: string; data?: any }> = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        const rowNumber = i + 2;

        try {
          // Validate required fields
          if (!row['LR Date']) throw new Error('LR Date is required');
          if (!row['Branch Code']) throw new Error('Branch Code is required');
          if (!row['Origin City']) throw new Error('Origin City is required');
          if (!row['Destination City']) throw new Error('Destination City is required');
          if (!row['Consignor Name']) throw new Error('Consignor Name is required');
          if (!row['Consignee Name']) throw new Error('Consignee Name is required');

          // Get branch_id from branch_code
          const { data: branchData, error: branchError } = await supabase
            .from('branch_master')
            .select('id')
            .eq('branch_code', row['Branch Code'])
            .maybeSingle();

          if (branchError || !branchData) {
            throw new Error(`Invalid Branch Code: ${row['Branch Code']}`);
          }

          // Get origin city_id
          const { data: originData, error: originError } = await supabase
            .from('city_master')
            .select('id')
            .eq('city_name', row['Origin City'])
            .maybeSingle();

          if (originError || !originData) {
            throw new Error(`Invalid Origin City: ${row['Origin City']}`);
          }

          // Get destination city_id
          const { data: destData, error: destError } = await supabase
            .from('city_master')
            .select('id')
            .eq('city_name', row['Destination City'])
            .maybeSingle();

          if (destError || !destData) {
            throw new Error(`Invalid Destination City: ${row['Destination City']}`);
          }

          // Prepare LR data
          const lrData = {
            lr_date: row['LR Date'],
            branch_id: branchData.id,
            origin_id: originData.id,
            destination_id: destData.id,
            consignor_name: row['Consignor Name'],
            consignor_address: row['Consignor Address'] || '',
            consignor_gstin: row['Consignor GSTIN'] || '',
            consignee_name: row['Consignee Name'],
            consignee_address: row['Consignee Address'] || '',
            consignee_gstin: row['Consignee GSTIN'] || '',
            billing_party_name: row['Billing Party Name'] || row['Consignor Name'],
            billing_party_gstin: row['Billing Party GSTIN'] || row['Consignor GSTIN'] || '',
            vehicle_number: row['Vehicle Number'] || '',
            driver_name: row['Driver Name'] || '',
            driver_mobile: row['Driver Mobile'] || '',
            pay_basis: row['Pay Basis'] || 'To Pay',
            load_type: row['Load Type'] || 'Full Truck Load',
            material_description: row['Material Description'] || '',
            quantity: row['Quantity'] ? parseFloat(row['Quantity']) : 0,
            unit: row['Unit'] || 'Boxes',
            weight: row['Weight (kg)'] ? parseFloat(row['Weight (kg)']) : 0,
            edd: row['EDD (Estimated Delivery Date)'] || null,
            freight_amount: row['Freight Amount'] ? parseFloat(row['Freight Amount']) : 0,
            advance_amount: row['Advance Amount'] ? parseFloat(row['Advance Amount']) : 0,
            balance_amount: row['Balance Amount'] ? parseFloat(row['Balance Amount']) : 0,
            eway_bill_no: row['E-way Bill No'] || '',
            eway_bill_valid_till: row['E-way Bill Valid Till'] || null,
            invoice_number: row['Invoice Number'] || '',
            invoice_date: row['Invoice Date'] || null,
            invoice_value: row['Invoice Value'] ? parseFloat(row['Invoice Value']) : 0,
            remarks: row['Remarks'] || ''
          };

          // Insert LR
          const { error: insertError } = await supabase
            .from('booking_lr')
            .insert([lrData]);

          if (insertError) {
            throw new Error(insertError.message);
          }

          successCount++;
        } catch (error: any) {
          failedCount++;
          errors.push({
            row: rowNumber,
            error: error.message,
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
      alert(`Error processing file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LR Bulk Upload</h1>
        <p className="text-gray-600 mt-2">Upload multiple LR entries using an Excel file</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={downloadTemplate}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            Download Template
          </button>

          <label className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer border-2 border-dashed border-gray-300">
            <FileSpreadsheet className="h-5 w-5" />
            {file ? file.name : 'Select Excel File'}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {file && (
          <div className="mt-4">
            <button
              onClick={processUpload}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5" />
              {uploading ? 'Uploading...' : 'Upload LR Data'}
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Results</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Successful</p>
                <p className="text-2xl font-bold text-green-700">{result.success}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-red-600 font-medium">Failed</p>
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Errors
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                {result.errors.map((error, idx) => (
                  <div key={idx} className="mb-3 pb-3 border-b border-red-200 last:border-0 last:pb-0 last:mb-0">
                    <p className="text-sm font-medium text-red-800">Row {error.row}:</p>
                    <p className="text-sm text-red-600 mt-1">{error.error}</p>
                    {error.data && (
                      <p className="text-xs text-red-500 mt-1">
                        Data: {JSON.stringify(error.data).substring(0, 100)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>Download the Excel template using the "Download Template" button</li>
          <li>Fill in the LR details in the template file</li>
          <li>Ensure Branch Code, Origin City, and Destination City match existing master data</li>
          <li>Required fields: LR Date, Branch Code, Origin, Destination, Consignor Name, Consignee Name</li>
          <li>Upload the completed Excel file using the "Select Excel File" button</li>
          <li>Click "Upload LR Data" to process and import the LR entries</li>
        </ul>
      </div>
    </div>
  );
}
