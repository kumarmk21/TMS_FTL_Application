import { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VendorUpdate {
  vendorCode: string;
  branchCode: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export function VendorBranchUpdate() {
  const [updates, setUpdates] = useState<VendorUpdate[]>([]);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const csvContent = `Vendor Code,Booking Branch
V0000001,BR001
V0000002,BR002
V0000003,BR001`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'vendor_branches_template.csv');
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

    try {
      const text = await file.text();
      const lines = text.split('\n').map(line => line.replace(/\r$/, ''));

      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        return;
      }

      const parsedUpdates: VendorUpdate[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);

        if (values.length < 2) {
          errors.push(`Line ${i + 1}: Insufficient columns (expected 2: Vendor Code, Booking Branch)`);
          continue;
        }

        const [vendorCode, branchCode] = values;

        if (!vendorCode || !branchCode) {
          errors.push(`Line ${i + 1}: Missing ${!vendorCode ? 'Vendor Code' : 'Booking Branch'}`);
          continue;
        }

        parsedUpdates.push({
          vendorCode: vendorCode.trim(),
          branchCode: branchCode.trim(),
          status: 'pending',
        });
      }

      if (parsedUpdates.length === 0) {
        let errorMsg = 'No valid records found in the file.';
        if (errors.length > 0) {
          errorMsg += '\n\nErrors found:\n' + errors.join('\n');
        }
        alert(errorMsg);
        return;
      }

      if (errors.length > 0) {
        const proceed = confirm(
          `Found ${errors.length} error(s) in the CSV file:\n\n${errors.slice(0, 3).join('\n')}\n${
            errors.length > 3 ? `... and ${errors.length - 3} more\n\n` : '\n'
          }Continue with ${parsedUpdates.length} valid record(s)?`
        );
        if (!proceed) return;
      }

      setUpdates(parsedUpdates);
      setCompleted(false);
    } catch (error: any) {
      console.error('Error reading file:', error);
      alert(`Failed to read file: ${error.message}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExecuteUpdates = async () => {
    if (updates.length === 0) return;

    const proceed = confirm(
      `Are you sure you want to update ${updates.length} vendor(s)?\n\nThis will change the booking branch for these vendors.`
    );

    if (!proceed) return;

    setProcessing(true);

    const updatedRecords = [...updates];

    for (let i = 0; i < updatedRecords.length; i++) {
      const update = updatedRecords[i];

      try {
        const { data: vendor, error: fetchError } = await supabase
          .from('vendor_master')
          .select('id, vendor_code, vendor_name')
          .eq('vendor_code', update.vendorCode)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!vendor) {
          updatedRecords[i] = {
            ...update,
            status: 'error',
            message: 'Vendor not found',
          };
          setUpdates([...updatedRecords]);
          continue;
        }

        const { error: updateError } = await supabase
          .from('vendor_master')
          .update({ ven_bk_branch: update.branchCode })
          .eq('id', vendor.id);

        if (updateError) throw updateError;

        updatedRecords[i] = {
          ...update,
          status: 'success',
          message: `Updated to branch ${update.branchCode}`,
        };
      } catch (error: any) {
        updatedRecords[i] = {
          ...update,
          status: 'error',
          message: error.message || 'Update failed',
        };
      }

      setUpdates([...updatedRecords]);
    }

    setProcessing(false);
    setCompleted(true);

    const successCount = updatedRecords.filter(u => u.status === 'success').length;
    const errorCount = updatedRecords.filter(u => u.status === 'error').length;

    alert(
      `Update completed!\n\nSuccessful: ${successCount}\nFailed: ${errorCount}`
    );
  };

  const handleReset = () => {
    setUpdates([]);
    setCompleted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pendingCount = updates.filter(u => u.status === 'pending').length;
  const successCount = updates.filter(u => u.status === 'success').length;
  const errorCount = updates.filter(u => u.status === 'error').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Branch Bulk Update</h1>
          <p className="text-sm text-gray-600 mt-1">Upload a CSV file to update vendor booking branches</p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Download Template
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Download the CSV template using the button above</li>
              <li>Fill in your vendor codes and booking branch codes</li>
              <li>Upload the completed CSV file</li>
              <li>Review the changes in the preview table</li>
              <li>Click "Execute Updates" to apply the changes</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {updates.length === 0 ? (
            <>
              <Upload className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload CSV File</h3>
              <p className="text-sm text-gray-600 mb-4">Choose a CSV file with vendor codes and branch codes</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Select File
              </button>
            </>
          ) : (
            <>
              <div className="w-full mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Preview ({updates.length} record{updates.length !== 1 ? 's' : ''})
                  </h3>
                  <div className="flex items-center gap-4">
                    {successCount > 0 && (
                      <span className="text-sm text-green-600 font-medium">
                        {successCount} successful
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="text-sm text-red-600 font-medium">
                        {errorCount} failed
                      </span>
                    )}
                    {!completed && (
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    {completed ? (
                      <button
                        onClick={handleReset}
                        className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Upload New File
                      </button>
                    ) : (
                      <button
                        onClick={handleExecuteUpdates}
                        disabled={processing || pendingCount === 0}
                        className="px-6 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing ? 'Processing...' : 'Execute Updates'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vendor Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Booking Branch
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Message
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {updates.map((update, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {update.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                  Pending
                                </span>
                              )}
                              {update.status === 'success' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3" />
                                  Success
                                </span>
                              )}
                              {update.status === 'error' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  <AlertCircle className="w-3 h-3" />
                                  Error
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">
                                {update.vendorCode}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {update.branchCode}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-sm ${
                                update.status === 'error' ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {update.message || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
