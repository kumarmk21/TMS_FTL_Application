import { useState } from 'react';
import { Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface THCRecord {
  thc_id: string;
  thc_advance_date: string | null;
  thc_id_number: string;
  lr_number: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  thc_vendor: string;
  thc_amount: number | null;
  thc_advance_amount: number | null;
  ven_act_name: string | null;
  ven_act_number: string | null;
  ven_act_ifsc: string | null;
  ven_act_bank: string | null;
  ven_act_branch: string | null;
  vehicle_number: string | null;
  thc_net_payable_amount: number | null;
  ath_date: string | null;
  vendor_name?: string;
}

export default function RegenerateAdvanceBankFile() {
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const generateCSVContent = (records: THCRecord[], athDateFormatted: string): string => {
    const lines: string[] = [];

    records.forEach(record => {
      const fields = [
        'N',
        '',
        record.ven_act_number || '',
        record.thc_advance_amount?.toString() || '0',
        record.vendor_name || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        record.vehicle_number || '',
        record.lr_number || '',
        record.thc_net_payable_amount?.toString() || '0',
        record.thc_advance_amount?.toString() || '0',
        record.origin || '',
        record.destination || '',
        record.vehicle_type || '',
        '',
        '',
        athDateFormatted,
        '',
        record.ven_act_ifsc || '',
        record.ven_act_bank || '',
        record.ven_act_branch || '',
        'dlslogisticsin@gmail.com'
      ];

      lines.push(fields.join(','));
    });

    return lines.join('\n');
  };

  const handleSubmit = async () => {
    if (!advanceDate) {
      alert('Please select an Advance Date');
      return;
    }

    setUploadStatus('processing');
    setUploadMessage('Fetching records and generating bank file...');

    try {
      const { data, error } = await supabase
        .from('thc_details')
        .select(`
          thc_id,
          thc_advance_date,
          thc_id_number,
          lr_number,
          origin,
          destination,
          vehicle_type,
          thc_vendor,
          thc_amount,
          thc_advance_amount,
          ven_act_name,
          ven_act_number,
          ven_act_ifsc,
          ven_act_bank,
          ven_act_branch,
          vehicle_number,
          thc_net_payable_amount,
          ath_date
        `)
        .eq('ath_date', advanceDate)
        .order('thc_id_number', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setUploadStatus('error');
        setUploadMessage('No records found for the selected Advance Date');
        setTimeout(() => setUploadStatus('idle'), 5000);
        return;
      }

      const vendorIds = [...new Set(data.map(r => r.thc_vendor))];
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendor_master')
        .select('id, vendor_name')
        .in('id', vendorIds);

      if (vendorError) {
        console.error('Vendor query error:', vendorError);
      }

      const vendorMap = new Map(vendorData?.map(v => [v.id, v.vendor_name]) || []);

      const enrichedRecords = data.map(record => ({
        ...record,
        vendor_name: vendorMap.get(record.thc_vendor) || 'Unknown'
      }));

      const formattedAthDate = new Date(advanceDate).toLocaleDateString('en-GB');

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const filename = `2294${dd}${yy}.001`;

      const csvContent = generateCSVContent(enrichedRecords, formattedAthDate);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setUploadStatus('success');
      setUploadMessage(`Successfully generated bank file: ${filename} with ${enrichedRecords.length} records`);
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
      }, 5000);
    } catch (error: any) {
      console.error('Error generating bank file:', error);
      setUploadStatus('error');
      setUploadMessage(`Failed to generate bank file: ${error.message}`);
      setTimeout(() => setUploadStatus('idle'), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Advance Bank Payment File Regenerate</h1>
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
            <p className="font-medium whitespace-pre-wrap break-words">{uploadMessage}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="max-w-md space-y-6">
          <div>
            <label htmlFor="advanceDate" className="block text-sm font-medium text-gray-700 mb-2">
              Advance Date
            </label>
            <input
              id="advanceDate"
              type="date"
              value={advanceDate}
              onChange={(e) => setAdvanceDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Select the ATH date to regenerate the bank payment file
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={uploadStatus === 'processing' || !advanceDate}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadStatus === 'processing' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Generate Bank File
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Select an Advance Date (ATH Date) from the calendar</li>
          <li>Click "Generate Bank File" to download the CSV file</li>
          <li>The file will contain all THC records with matching ATH date</li>
          <li>The file format is compatible with bank payment systems</li>
        </ul>
      </div>
    </div>
  );
}
