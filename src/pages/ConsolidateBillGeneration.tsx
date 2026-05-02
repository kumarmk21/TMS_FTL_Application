import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileText, Loader2, CheckCircle, Upload, X, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface BillingParty {
  billing_party_code: string;
  billing_party_name: string;
}

interface Company {
  company_code: string;
  company_name: string;
}

interface CustomerGST {
  id: string;
  customer_name: string;
  gstin: string;
  bill_to_address: string;
  state_code: string;
  alpha_code: string;
}

interface GeneratedBill {
  tran_id: string;
  bill_no: string;
  manual_lr_no: string;
  bill_date: string;
  lr_date: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  vehicle_number: string;
  lr_financial_status: string;
  billing_party_code: string;
  billing_party_name: string;
  bill_amount: number;
  lr_total_amount: number;
  loading_charges: number;
  unloading_charges: number;
  detention_charges: number;
}

const CONSOL_BILL_STATUS_OPTIONS = ['Cons.Generated', 'Submitted', 'Partially Paid', 'Fully Paid', 'Disputed'];

export default function ConsolidateBillGeneration() {
  const { user } = useAuth();
  const [billingParties, setBillingParties] = useState<BillingParty[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [billFromCompany, setBillFromCompany] = useState('');
  const [selectedParty, setSelectedParty] = useState('');
  const [bills, setBills] = useState<GeneratedBill[]>([]);
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [billToOptions, setBillToOptions] = useState<CustomerGST[]>([]);
  const [billTo, setBillTo] = useState('');

  const [consolBillDate, setConsolBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [consolBillStatus, setConsolBillStatus] = useState('Cons.Generated');
  const [consolBillSubDate, setConsolBillSubDate] = useState('');
  const [consolBillSubmittedTo, setConsolBillSubmittedTo] = useState('');
  const [ackFile, setAckFile] = useState<File | null>(null);
  const [ackFileName, setAckFileName] = useState('');

  useEffect(() => {
    fetchBillingParties();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!selectedParty) {
      setBillToOptions([]);
      setBillTo('');
      return;
    }
    const party = billingParties.find(p => p.billing_party_code === selectedParty);
    if (!party) return;
    fetchBillToOptions(party.billing_party_name);
  }, [selectedParty, billingParties]);

  const fetchBillToOptions = async (partyName: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_gst_master')
        .select('id, customer_name, gstin, bill_to_address, state_code, alpha_code')
        .eq('customer_name', partyName)
        .order('gstin');
      if (error) throw error;
      setBillToOptions(data || []);
      setBillTo('');
    } catch (error) {
      console.error('Error fetching bill-to options:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('company_master')
        .select('company_code, company_name')
        .order('company_name');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchBillingParties = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('billing_party_code, billing_party_name')
        .not('bill_no', 'is', null)
        .is('consol_bill_number', null)
        .not('billing_party_code', 'is', null)
        .order('billing_party_name');

      if (error) throw error;

      const uniqueParties = data.reduce((acc: BillingParty[], current) => {
        if (!acc.find(p => p.billing_party_code === current.billing_party_code)) {
          acc.push({
            billing_party_code: current.billing_party_code,
            billing_party_name: current.billing_party_name || current.billing_party_code
          });
        }
        return acc;
      }, []);

      setBillingParties(uniqueParties);
    } catch (error) {
      console.error('Error fetching billing parties:', error);
      alert('Error loading billing parties');
    }
  };

  const handleSearch = async () => {
    if (!selectedParty) {
      alert('Please select a billing party');
      return;
    }

    setLoading(true);
    setShowResults(false);
    setSelectedBills(new Set());
    setSuccessMessage('');

    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('tran_id, bill_no, manual_lr_no, bill_date, lr_date, from_city, to_city, vehicle_type, vehicle_number, lr_financial_status, billing_party_code, billing_party_name, bill_amount, lr_total_amount, loading_charges, unloading_charges, detention_charges')
        .eq('billing_party_code', selectedParty)
        .not('bill_no', 'is', null)
        .is('consol_bill_number', null)
        .order('bill_date', { ascending: true });

      if (error) throw error;

      setBills(data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error fetching bills:', error);
      alert('Error loading bills');
    } finally {
      setLoading(false);
    }
  };

  const toggleBillSelection = (tranId: string) => {
    const newSelected = new Set(selectedBills);
    if (newSelected.has(tranId)) {
      newSelected.delete(tranId);
    } else {
      newSelected.add(tranId);
    }
    setSelectedBills(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedBills.size === bills.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(bills.map(bill => bill.tran_id)));
    }
  };

  const getSelectedBillsTotal = () => {
    return bills
      .filter(b => selectedBills.has(b.tran_id))
      .reduce((sum, b) => sum + (Number(b.lr_total_amount) || Number(b.bill_amount) || 0), 0);
  };

  const downloadCSV = () => {
    const partyName = billingParties.find(p => p.billing_party_code === selectedParty)?.billing_party_name || selectedParty;
    const headers = ['LR No', 'LR Date', 'Bill Number', 'Bill Date', 'Billing Party', 'From City', 'To City', 'Vehicle Type', 'Vehicle No', 'Loading+Unloading Amt', 'Detention Amt', 'LR Total Amt', 'Bill Amount'];
    const rows = bills.map(b => [
      b.manual_lr_no || b.bill_no,
      b.lr_date ? new Date(b.lr_date).toLocaleDateString('en-GB') : '',
      b.bill_no || '',
      b.bill_date ? new Date(b.bill_date).toLocaleDateString('en-GB') : '',
      b.billing_party_name || '',
      b.from_city || '',
      b.to_city || '',
      b.vehicle_type || '',
      b.vehicle_number || '',
      (Number(b.loading_charges || 0) + Number(b.unloading_charges || 0)).toFixed(2),
      Number(b.detention_charges || 0).toFixed(2),
      Number(b.lr_total_amount || 0).toFixed(2),
      (Number(b.lr_total_amount) || Number(b.bill_amount) || 0).toFixed(2),
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consol-bills-${partyName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateConsolBillNo = async (): Promise<string> => {
    const { data: companyData } = await supabase
      .from('company_master')
      .select('gstin')
      .not('gstin', 'is', null)
      .limit(1)
      .maybeSingle();

    const gstinPrefix = companyData?.gstin ? companyData.gstin.substring(0, 2) : 'CB';

    // FY prefix: financial year ending 2 digits (e.g. Apr 2026–Mar 2027 → "27")
    const now = new Date();
    const fyYear = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
    const fyPrefix = String(fyYear).slice(-2);

    const fullPrefix = `${gstinPrefix}${fyPrefix}`; // e.g. "2727"

    const { data } = await supabase
      .from('consol_bill_data')
      .select('consol_bill_no')
      .like('consol_bill_no', `${fullPrefix}%`)
      .order('consol_bill_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNum = 1;
    if (data?.consol_bill_no) {
      // Counter is always the last 5 chars
      const counter = data.consol_bill_no.slice(-5);
      const parsed = parseInt(counter, 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }

    return `${fullPrefix}${String(nextNum).padStart(5, '0')}`;
  };

  const handleAckFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAckFile(file);
      setAckFileName(file.name);
    }
  };

  const removeAckFile = () => {
    setAckFile(null);
    setAckFileName('');
  };

  const handleSubmit = async () => {
    if (selectedBills.size === 0) {
      alert('Please select at least one bill');
      return;
    }
    if (!consolBillDate) {
      alert('Please set a Consol Bill Date');
      return;
    }

    setSubmitting(true);
    try {
      const consolBillNo = await generateConsolBillNo();
      const totalAmount = getSelectedBillsTotal();
      const selectedPartyData = billingParties.find(p => p.billing_party_code === selectedParty);

      let ackUrl: string | null = null;
      let ackFilenameStored: string | null = null;

      if (ackFile) {
        const fileExt = ackFile.name.split('.').pop();
        const filePath = `${consolBillNo}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('consol-bill-ack')
          .upload(filePath, ackFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('consol-bill-ack')
          .getPublicUrl(filePath);

        ackUrl = urlData.publicUrl;
        ackFilenameStored = ackFile.name;
      }

      const { error: insertError } = await supabase
        .from('consol_bill_data')
        .insert({
          consol_bill_no: consolBillNo,
          consol_bill_date: consolBillDate,
          consol_billing_party: selectedPartyData?.billing_party_name || selectedParty,
          consol_bill_amount: totalAmount,
          consol_bill_pending_amount: totalAmount,
          consol_bill_sub_date: consolBillSubDate || null,
          consol_bill_submitted_to: consolBillSubmittedTo || null,
          consol_bill_ack_url: ackUrl,
          consol_bill_ack_filename: ackFilenameStored,
          consol_bill_status: consolBillStatus,
          bill_from_company: billFromCompany || null,
          created_by: user?.id,
          updated_by: user?.id,
        });

      if (insertError) throw insertError;

      const selectedTranIds = Array.from(selectedBills);
      const { error: updateError } = await supabase
        .from('booking_lr')
        .update({
          consol_bill_number: consolBillNo,
          consol_bill_date: consolBillDate,
          consol_bill_amount: totalAmount,
          consol_bill_pending_amount: totalAmount,
          lr_financial_status: 'Consol Bill Generated',
        })
        .in('tran_id', selectedTranIds);

      if (updateError) throw updateError;

      setSuccessMessage(`Consol Bill ${consolBillNo} generated successfully for ${selectedBills.size} bill(s). Total Amount: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      setSelectedBills(new Set());
      setAckFile(null);
      setAckFileName('');
      setConsolBillSubDate('');
      setConsolBillSubmittedTo('');
      setConsolBillStatus('Cons.Generated');
      setBillFromCompany('');

      await handleSearch();
    } catch (error) {
      console.error('Error generating consol bill:', error);
      alert('Error generating consolidation bill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTotal = getSelectedBillsTotal();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7" />
          Consolidate Bill Generation
        </h1>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-green-800 text-sm font-medium">{successMessage}</p>
          <button onClick={() => setSuccessMessage('')} className="ml-auto text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Search Bills</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billing Party <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedParty}
              onChange={(e) => { setSelectedParty(e.target.value); setShowResults(false); setSuccessMessage(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Billing Party</option>
              {billingParties.map((party) => (
                <option key={party.billing_party_code} value={party.billing_party_code}>
                  {party.billing_party_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !selectedParty}
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search
            </>
          )}
        </button>
      </div>

      {showResults && (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">
                Bills ({bills.length} found)
              </h2>
              <div className="flex items-center gap-4">
                {selectedBills.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedBills.size} selected &mdash; Total: <span className="font-semibold text-gray-900">&#8377;{selectedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </span>
                )}
                {bills.length > 0 && (
                  <button
                    onClick={downloadCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedBills.size === bills.length && bills.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From City</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To City</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">LUL Amt</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Detention Amt</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">LR Total Amt</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-6 py-8 text-center text-gray-500">
                        No bills found for the selected billing party
                      </td>
                    </tr>
                  ) : (
                    bills.map((bill) => (
                      <tr
                        key={bill.tran_id}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedBills.has(bill.tran_id) ? 'bg-red-50' : ''}`}
                        onClick={() => toggleBillSelection(bill.tran_id)}
                      >
                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedBills.has(bill.tran_id)}
                            onChange={() => toggleBillSelection(bill.tran_id)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bill.manual_lr_no || bill.bill_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {bill.lr_date ? new Date(bill.lr_date).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bill.bill_no || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bill.from_city || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bill.to_city || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bill.vehicle_type || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bill.vehicle_number || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          &#8377;{(Number(bill.loading_charges || 0) + Number(bill.unloading_charges || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          &#8377;{Number(bill.detention_charges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          &#8377;{Number(bill.lr_total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          &#8377;{(Number(bill.lr_total_amount) || Number(bill.bill_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {bills.length > 0 && selectedBills.size > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Consol Bill Details</h2>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 pb-1 border-b border-gray-200">Bill From / Bill To</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bill From (Company) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={billFromCompany}
                      onChange={e => setBillFromCompany(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select Company</option>
                      {companies.map(c => (
                        <option key={c.company_code} value={c.company_code}>
                          {c.company_name} ({c.company_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bill To <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={billTo}
                      onChange={e => setBillTo(e.target.value)}
                      disabled={!billFromCompany || billToOptions.length === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">
                        {!billFromCompany
                          ? 'Select Bill From first'
                          : billToOptions.length === 0
                          ? 'No records found'
                          : 'Select Bill To'}
                      </option>
                      {billToOptions.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.customer_name}{g.gstin ? ` — ${g.gstin}` : ''}{g.state_code ? ` (${g.state_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consol Bill Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={consolBillDate}
                    onChange={e => setConsolBillDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consol Bill Status</label>
                  <select
                    value={consolBillStatus}
                    onChange={e => setConsolBillStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {CONSOL_BILL_STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900 font-semibold">
                    &#8377;{selectedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{selectedBills.size}</span> bill(s) selected for consolidation
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selectedBills.size === 0}
                  className="px-8 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Generate Consol Bill
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
