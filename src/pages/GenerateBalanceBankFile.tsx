import { useState, useEffect } from 'react';
import { Search, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface THCRecord {
  thc_id: string;
  thc_date: string | null;
  thc_id_number: string;
  lr_number: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  thc_vendor: string;
  thc_amount: number | null;
  thc_balance_amount: number | null;
  ven_act_name: string | null;
  ven_act_number: string | null;
  ven_act_ifsc: string | null;
  ven_act_bank: string | null;
  ven_act_branch: string | null;
  vehicle_number: string | null;
  thc_net_payable_amount: number | null;
  thc_advance_amount: number | null;
  bth_due_date: string | null;
  thc_loading_charges: number | null;
  thc_unloading_charges: number | null;
  thc_detention_charges: number | null;
  thc_other_charges: number | null;
  thc_deduction_delay: number | null;
  thc_deduction_damage: number | null;
  thc_munshiyana_amount: number | null;
  thc_pod_delay_deduction: number | null;
  thc_tds_amount: number | null;
  vendor_name?: string;
  vendor_tds_applicable?: string | null;
  calculated_munshiyana: number;
  calculated_balance: number;
}

interface ChargeEdit {
  loading: string;
  unloading: string;
  detention: string;
  other: string;
  delay: string;
  damage: string;
  munshiyana_deduction: string;
  pod_delay: string;
  tds: string;
}

export default function GenerateBalanceBankFile() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<THCRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accountNames, setAccountNames] = useState<string[]>([]);
  const [balancePaymentDate, setBalancePaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [chargeEdits, setChargeEdits] = useState<Record<string, ChargeEdit>>({});

  useEffect(() => {
    fetchAccountNames();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchRecords();
    } else {
      setRecords([]);
      setChargeEdits({});
    }
  }, [selectedAccount]);

  const fetchAccountNames = async () => {
    try {
      const { data, error } = await supabase
        .from('thc_details')
        .select('ven_act_name')
        .not('ven_act_name', 'is', null)
        .gt('thc_balance_amount', 0)
        .is('thc_balance_payment_date', null);

      if (error) throw error;

      const uniqueAccounts = [...new Set(data?.map(r => r.ven_act_name).filter(Boolean) as string[])];
      setAccountNames(uniqueAccounts.sort());
    } catch (error: any) {
      console.error('Error fetching account names:', error);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    setUploadStatus('idle');
    setUploadMessage('');
    try {
      const { data, error } = await supabase
        .from('thc_details')
        .select(`
          thc_id,
          thc_date,
          thc_id_number,
          lr_number,
          origin,
          destination,
          vehicle_type,
          thc_vendor,
          thc_amount,
          thc_balance_amount,
          ven_act_name,
          ven_act_number,
          ven_act_ifsc,
          ven_act_bank,
          ven_act_branch,
          vehicle_number,
          thc_net_payable_amount,
          thc_advance_amount,
          bth_due_date,
          thc_loading_charges,
          thc_unloading_charges,
          thc_detention_charges,
          thc_other_charges,
          thc_deduction_delay,
          thc_deduction_damage,
          thc_munshiyana_amount,
          thc_pod_delay_deduction,
          thc_tds_amount
        `)
        .eq('ven_act_name', selectedAccount)
        .gt('thc_balance_amount', 0)
        .is('thc_balance_payment_date', null)
        .order('thc_date', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const vendorIds = [...new Set(data.map(r => r.thc_vendor))];
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendor_master')
          .select('id, vendor_name, tds_applicable')
          .in('id', vendorIds);

        if (vendorError) {
          console.error('Vendor query error:', vendorError);
        }

        const vendorMap = new Map(vendorData?.map(v => [v.id, { name: v.vendor_name, tds_applicable: v.tds_applicable }]) || []);

        const initEdits: Record<string, ChargeEdit> = {};
        const enrichedRecords = data.map(record => {
          const thcBalanceAmount = record.thc_balance_amount || 0;
          const calculated_munshiyana = thcBalanceAmount < 100000.00 ? 200 : 300;
          const deductions =
            (record.thc_deduction_delay || 0) +
            (record.thc_deduction_damage || 0) +
            (record.thc_munshiyana_amount || 0) +
            (record.thc_pod_delay_deduction || 0) +
            (record.thc_tds_amount || 0);
          const calculated_balance = thcBalanceAmount - calculated_munshiyana - deductions;

          const vendorInfo = vendorMap.get(record.thc_vendor);

          initEdits[record.thc_id] = {
            loading: record.thc_loading_charges != null ? record.thc_loading_charges.toString() : '',
            unloading: record.thc_unloading_charges != null ? record.thc_unloading_charges.toString() : '',
            detention: record.thc_detention_charges != null ? record.thc_detention_charges.toString() : '',
            other: record.thc_other_charges != null ? record.thc_other_charges.toString() : '',
            delay: record.thc_deduction_delay != null ? record.thc_deduction_delay.toString() : '',
            damage: record.thc_deduction_damage != null ? record.thc_deduction_damage.toString() : '',
            munshiyana_deduction: record.thc_munshiyana_amount != null ? record.thc_munshiyana_amount.toString() : '',
            pod_delay: record.thc_pod_delay_deduction != null ? record.thc_pod_delay_deduction.toString() : '',
            tds: record.thc_tds_amount != null ? record.thc_tds_amount.toString() : '',
          };

          return {
            ...record,
            vendor_name: vendorInfo?.name || 'Unknown',
            vendor_tds_applicable: vendorInfo?.tds_applicable || null,
            calculated_munshiyana,
            calculated_balance
          };
        });

        setChargeEdits(initEdits);
        setRecords(enrichedRecords);
      } else {
        setRecords([]);
        setChargeEdits({});
      }
    } catch (error: any) {
      console.error('Error fetching records:', error);
      setUploadStatus('error');
      setUploadMessage(`Failed to fetch records: ${error.message || 'Unknown error'}`);
      setTimeout(() => setUploadStatus('idle'), 5000);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const updateChargeEdit = (thcId: string, field: keyof ChargeEdit, value: string) => {
    setChargeEdits(prev => ({
      ...prev,
      [thcId]: { ...prev[thcId], [field]: value }
    }));
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.thc_id)));
    }
  };

  const toggleSelectRecord = (thcId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(thcId)) {
      newSelected.delete(thcId);
    } else {
      newSelected.add(thcId);
    }
    setSelectedRecords(newSelected);
  };

  const generateCSVContent = (selectedRecordsData: THCRecord[]): string => {
    const lines: string[] = [];

    const formattedDate = balancePaymentDate ? new Date(balancePaymentDate).toLocaleDateString('en-GB') : '';

    selectedRecordsData.forEach(record => {
      const fields = [
        'N',
        '',
        record.ven_act_number || '',
        getEffectiveBalance(record).toFixed(2),
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
        record.thc_balance_amount?.toString() || '0',
        record.calculated_munshiyana.toFixed(2),
        record.origin || '',
        record.destination || '',
        record.vehicle_type || '',
        '',
        '',
        formattedDate,
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
    if (selectedRecords.size === 0) {
      alert('Please select at least one record');
      return;
    }

    setUploadStatus('processing');
    setUploadMessage('Updating records and generating bank file...');

    try {
      const selectedRecordsData = records.filter(r => selectedRecords.has(r.thc_id));

      const { data: statusData, error: statusError } = await supabase
        .from('status_master')
        .select('id')
        .eq('status_name', 'Financially Close')
        .single();

      if (statusError) {
        console.error('Error fetching status:', statusError);
        throw new Error('Failed to fetch Financially Close status');
      }

      const updatePromises = selectedRecordsData.map(record => {
        const edits = chargeEdits[record.thc_id] || { loading: '', unloading: '', detention: '', other: '', delay: '', damage: '', munshiyana_deduction: '', pod_delay: '', tds: '' };
        return supabase
          .from('thc_details')
          .update({
            thc_balance_payment_date: balancePaymentDate,
            thc_status_fin: statusData.id,
            thc_balance_amount: getEffectiveBalance(record),
            thc_loading_charges: edits.loading !== '' ? parseFloat(edits.loading) : null,
            thc_unloading_charges: edits.unloading !== '' ? parseFloat(edits.unloading) : null,
            thc_detention_charges: edits.detention !== '' ? parseFloat(edits.detention) : null,
            thc_other_charges: edits.other !== '' ? parseFloat(edits.other) : null,
            thc_deduction_delay: edits.delay !== '' ? parseFloat(edits.delay) : null,
            thc_deduction_damage: edits.damage !== '' ? parseFloat(edits.damage) : null,
            thc_munshiyana_amount: edits.munshiyana_deduction !== '' ? parseFloat(edits.munshiyana_deduction) : null,
            thc_pod_delay_deduction: edits.pod_delay !== '' ? parseFloat(edits.pod_delay) : null,
            thc_tds_amount: edits.tds !== '' ? parseFloat(edits.tds) : null,
          })
          .eq('thc_id', record.thc_id);
      });

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        console.error('Update errors:', errors);
        throw new Error(`Failed to update ${errors.length} records`);
      }

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const filename = `2294${dd}${yy}_Balance.001`;

      const csvContent = generateCSVContent(selectedRecordsData);
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
      setUploadMessage(`Successfully generated balance bank file: ${filename}`);
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
      }, 5000);

      setSelectedRecords(new Set());
      fetchRecords();
    } catch (error: any) {
      console.error('Error generating bank file:', error);
      setUploadStatus('error');
      setUploadMessage(`Failed to generate bank file: ${error.message}`);
      setTimeout(() => setUploadStatus('idle'), 5000);
    }
  };

  const isTdsMandatory = (record: THCRecord): boolean => {
    const tdsApplicable = record.vendor_tds_applicable;
    const tdsApplies = tdsApplicable && tdsApplicable.toLowerCase() !== 'no' && tdsApplicable.toLowerCase() !== 'n' && tdsApplicable !== 'false';
    const tdsNotDeducted = !record.thc_tds_amount;
    return !!(tdsApplies && tdsNotDeducted);
  };

  const renderTdsInput = (record: THCRecord) => {
    const isSelected = selectedRecords.has(record.thc_id);
    const mandatory = isTdsMandatory(record);
    const value = chargeEdits[record.thc_id]?.tds ?? '';
    const hasData = record.thc_tds_amount != null;

    if (!mandatory && !hasData && !isSelected) {
      return <span className="text-gray-400">-</span>;
    }

    return (
      <input
        type="number"
        value={value}
        onChange={(e) => updateChargeEdit(record.thc_id, 'tds', e.target.value)}
        className={`w-24 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 text-right ${
          mandatory && !value
            ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-red-500 focus:border-red-500'
        }`}
        placeholder={mandatory ? 'Required' : '0'}
        min="0"
      />
    );
  };

  const getEffectiveBalance = (record: THCRecord): number => {
    const e = chargeEdits[record.thc_id] || {};
    const base = record.thc_balance_amount || 0;
    const additions =
      (parseFloat(e.loading || '0') || 0) +
      (parseFloat(e.unloading || '0') || 0) +
      (parseFloat(e.detention || '0') || 0) +
      (parseFloat(e.other || '0') || 0);
    const deductions =
      (parseFloat(e.delay || '0') || 0) +
      (parseFloat(e.damage || '0') || 0) +
      (parseFloat(e.munshiyana_deduction || '0') || 0) +
      (parseFloat(e.pod_delay || '0') || 0) +
      (parseFloat(e.tds || '0') || 0);
    return base - record.calculated_munshiyana + additions - deductions;
  };

  const renderDeductionInput = (record: THCRecord, field: keyof ChargeEdit, dbField: keyof THCRecord) => {
    const isSelected = selectedRecords.has(record.thc_id);
    const hasData = record[dbField] != null;
    const showInput = hasData || isSelected;
    const value = chargeEdits[record.thc_id]?.[field] ?? '';

    if (!showInput) {
      return <span className="text-gray-400">-</span>;
    }

    return (
      <input
        type="number"
        value={value}
        onChange={(e) => updateChargeEdit(record.thc_id, field, e.target.value)}
        className="w-24 px-2 py-1 text-sm border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-right text-red-700 bg-red-50"
        placeholder="0"
        min="0"
      />
    );
  };

  const renderChargeInput = (record: THCRecord, field: keyof ChargeEdit, dbField: keyof THCRecord) => {
    const isSelected = selectedRecords.has(record.thc_id);
    const hasData = record[dbField] != null;
    const showInput = hasData || isSelected;
    const value = chargeEdits[record.thc_id]?.[field] ?? '';

    if (!showInput) {
      return <span className="text-gray-400">-</span>;
    }

    return (
      <input
        type="number"
        value={value}
        onChange={(e) => updateChargeEdit(record.thc_id, field, e.target.value)}
        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-right"
        placeholder="0"
        min="0"
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">BTH Payment</h1>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Vendor Account Name</option>
              {accountNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={records.length > 0 && selectedRecords.size === records.length}
                    onChange={toggleSelectAll}
                    disabled={records.length === 0}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  THC ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  THC Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LR Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Number
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  THC Balance
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Munshiyana
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  + Loading Charges
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  + Unloading Charges
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  + Detention Charges
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  + Other Charges
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  - Delay Deduction
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  - Damage Deduction
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  - Munshiyana Amt
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  - POD Delay Deduction
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  - TDS Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Payable
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IFSC
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Days
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={27} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading records...
                  </td>
                </tr>
              ) : !selectedAccount ? (
                <tr>
                  <td colSpan={27} className="px-4 py-12 text-center text-gray-500">
                    Please select a vendor account name
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={27} className="px-4 py-12 text-center text-gray-500">
                    No records found with pending balance payments
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.thc_id} className={`hover:bg-gray-50 ${selectedRecords.has(record.thc_id) ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRecords.has(record.thc_id)}
                        onChange={() => toggleSelectRecord(record.thc_id)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.thc_id_number}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {record.thc_date || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {record.lr_number || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.origin || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.destination || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.vehicle_type || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.vendor_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.vehicle_number || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                      {record.thc_balance_amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                      {record.calculated_munshiyana.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {renderChargeInput(record, 'loading', 'thc_loading_charges')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {renderChargeInput(record, 'unloading', 'thc_unloading_charges')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {renderChargeInput(record, 'detention', 'thc_detention_charges')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {renderChargeInput(record, 'other', 'thc_other_charges')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {renderDeductionInput(record, 'delay', 'thc_deduction_delay')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {renderDeductionInput(record, 'damage', 'thc_deduction_damage')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {renderDeductionInput(record, 'munshiyana_deduction', 'thc_munshiyana_amount')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {renderDeductionInput(record, 'pod_delay', 'thc_pod_delay_deduction')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {renderTdsInput(record)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {getEffectiveBalance(record).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.ven_act_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.ven_act_number || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.ven_act_ifsc || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.ven_act_bank || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.ven_act_branch || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.bth_due_date || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {records.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <p className="text-sm text-gray-600">
                Selected: <span className="font-semibold">{selectedRecords.size}</span> of{' '}
                <span className="font-semibold">{records.length}</span> records
              </p>
              {selectedRecords.size > 0 && (
                <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-medium">Selected Records</p>
                    <p className="text-lg font-bold text-gray-900">{selectedRecords.size}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-medium">Sum of Net Payable</p>
                    <p className="text-lg font-bold text-red-600">
                      ₹{records
                        .filter(r => selectedRecords.has(r.thc_id))
                        .reduce((sum, r) => sum + getEffectiveBalance(r), 0)
                        .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Balance Payment Date:</label>
                <input
                  type="date"
                  value={balancePaymentDate}
                  onChange={(e) => setBalancePaymentDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={selectedRecords.size === 0}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Save Records
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
