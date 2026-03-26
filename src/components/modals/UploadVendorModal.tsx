import { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';

interface UploadResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadVendorModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Vendor Code': 'VEN001',
        'Vendor Name': 'Sample Vendor Pvt Ltd',
        'Vendor Type': 'Admin',
        'Booking Branch': 'BRANCH001',
        'Vendor Address': '123 MG Road, Mumbai, Maharashtra',
        'Vendor Phone': '9876543210',
        'PAN': 'ABCDE1234F',
        'Email ID': 'vendor@example.com',
        'Account No': '1234567890123456',
        'Bank Name': 'State Bank of India',
        'IFSC Code': 'SBIN0001234',
        'TDS Applicable': 'Y',
        'TDS Category': '194C',
        'TDS Rate (%)': '2',
        'Status': 'Active',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendor Template');

    ws['!cols'] = [
      { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 16 },
      { wch: 35 }, { wch: 14 }, { wch: 12 }, { wch: 25 },
      { wch: 20 }, { wch: 25 }, { wch: 14 }, { wch: 16 },
      { wch: 14 }, { wch: 14 }, { wch: 10 },
    ];

    XLSX.writeFile(wb, 'Vendor_Master_Upload_Template.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        alert('The uploaded file has no data rows.');
        setUploading(false);
        return;
      }

      const uploadResult: UploadResult = { success: 0, failed: 0, errors: [] };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const vendorCode = String(row['Vendor Code'] || '').trim();
        const vendorName = String(row['Vendor Name'] || '').trim();
        const vendorType = String(row['Vendor Type'] || '').trim();
        const vendorAddress = String(row['Vendor Address'] || '').trim();
        const vendorPhone = String(row['Vendor Phone'] || '').trim();
        const accountNo = String(row['Account No'] || '').trim();
        const bankName = String(row['Bank Name'] || '').trim();

        if (!vendorCode) {
          uploadResult.failed++;
          uploadResult.errors.push({ row: rowNum, error: 'Vendor Code is required', data: row });
          continue;
        }
        if (!vendorName) {
          uploadResult.failed++;
          uploadResult.errors.push({ row: rowNum, error: 'Vendor Name is required', data: row });
          continue;
        }
        if (!vendorType || !['Admin', 'Transporter'].includes(vendorType)) {
          uploadResult.failed++;
          uploadResult.errors.push({ row: rowNum, error: `Vendor Type must be 'Admin' or 'Transporter' (got: '${vendorType}')`, data: row });
          continue;
        }
        if (!vendorAddress) {
          uploadResult.failed++;
          uploadResult.errors.push({ row: rowNum, error: 'Vendor Address is required', data: row });
          continue;
        }
        if (!vendorPhone) {
          uploadResult.failed++;
          uploadResult.errors.push({ row: rowNum, error: 'Vendor Phone is required', data: row });
          continue;
        }
        if (!accountNo) {
          uploadResult.failed++;
          uploadResult.errors.push({ row: rowNum, error: 'Account No is required', data: row });
          continue;
        }
        if (!bankName) {
          uploadResult.failed++;
          uploadResult.errors.push({ row: rowNum, error: 'Bank Name is required', data: row });
          continue;
        }

        const tdsApplicable = String(row['TDS Applicable'] || '').trim().toUpperCase();
        const tdsRateRaw = row['TDS Rate (%)'];
        const tdsRate = tdsRateRaw !== '' && tdsRateRaw !== null ? parseFloat(String(tdsRateRaw)) : null;
        const statusRaw = String(row['Status'] || 'Active').trim().toLowerCase();
        const isActive = statusRaw !== 'inactive';

        const record = {
          vendor_code: vendorCode,
          vendor_name: vendorName,
          vendor_type: vendorType,
          ven_bk_branch: String(row['Booking Branch'] || '').trim() || null,
          vendor_address: vendorAddress,
          vendor_phone: vendorPhone,
          pan: String(row['PAN'] || '').trim() || null,
          email_id: String(row['Email ID'] || '').trim() || null,
          account_no: accountNo,
          bank_name: bankName,
          ifsc_code: String(row['IFSC Code'] || '').trim() || null,
          tds_applicable: tdsApplicable === 'Y' ? 'Y' : 'N',
          tds_category: String(row['TDS Category'] || '').trim() || null,
          tds_rate: isNaN(tdsRate as number) ? null : tdsRate,
          is_active: isActive,
        };

        const { error } = await supabase
          .from('vendor_master')
          .upsert(record, { onConflict: 'vendor_code' });

        if (error) {
          uploadResult.failed++;
          uploadResult.errors.push({ row: rowNum, error: error.message, data: row });
        } else {
          uploadResult.success++;
        }
      }

      setResult(uploadResult);
      if (uploadResult.success > 0) onSuccess();
    } catch (err: any) {
      alert('Failed to process file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Vendor Master</h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-1">Instructions</p>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>Download the template and fill in vendor details</li>
              <li>Vendor Type must be <strong>Admin</strong> or <strong>Transporter</strong></li>
              <li>TDS Applicable must be <strong>Y</strong> or <strong>N</strong></li>
              <li>If a Vendor Code already exists, it will be updated</li>
              <li>Required fields: Vendor Code, Vendor Name, Vendor Type, Vendor Address, Vendor Phone, Account No, Bank Name</li>
            </ul>
          </div>

          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download Upload Template
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel / CSV File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              {file ? (
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600">Click to select or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv supported</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">{result.success} Successful</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">{result.failed} Failed</span>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-800">Errors</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-red-100">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="px-4 py-2">
                        <span className="text-xs font-semibold text-red-700">Row {err.row}: </span>
                        <span className="text-xs text-red-600">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Vendors
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
