import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Search } from 'lucide-react';
import { ConsolBillPrintPreview } from '../components/ConsolBillPrintPreview';

interface ConsolBill {
  tran_id: string;
  consol_bill_no: string;
  consol_bill_date: string;
  consol_billing_party: string;
  consol_bill_amount: number;
  consol_bill_status: string;
  bill_from_company: string | null;
}

export default function ConsolBillPrint() {
  const [billingParties, setBillingParties] = useState<{ code: string; name: string }[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [consolBillNumber, setConsolBillNumber] = useState('');
  const [bills, setBills] = useState<ConsolBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingParties();
  }, []);

  const fetchBillingParties = async () => {
    try {
      const { data, error } = await supabase
        .from('consol_bill_data')
        .select('consol_billing_party')
        .order('consol_billing_party');
      if (error) throw error;
      const unique = Array.from(new Set((data || []).map((r) => r.consol_billing_party)))
        .filter(Boolean)
        .map((name) => ({ code: name, name }));
      setBillingParties(unique);
    } catch (error) {
      console.error('Error fetching billing parties:', error);
    }
  };

  const handleSearch = async () => {
    if (!selectedParty && !consolBillNumber) {
      alert('Please select a billing party or enter a Consol Bill Number');
      return;
    }
    setLoading(true);
    try {
      let query = supabase
        .from('consol_bill_data')
        .select('tran_id, consol_bill_no, consol_bill_date, consol_billing_party, consol_bill_amount, consol_bill_status, bill_from_company');

      if (consolBillNumber) {
        query = query.ilike('consol_bill_no', `%${consolBillNumber}%`);
      }
      if (selectedParty) {
        query = query.eq('consol_billing_party', selectedParty);
      }

      const { data, error } = await query.order('consol_bill_date', { ascending: false });
      if (error) throw error;
      setBills(data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching consol bills:', error);
      alert('Error searching bills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatAmount = (amount: number) =>
    amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '0.00';

  if (selectedBillId) {
    return (
      <ConsolBillPrintPreview
        consolBillId={selectedBillId}
        onClose={() => setSelectedBillId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-red-600" />
        <h1 className="text-2xl font-bold text-gray-900">Consol Bill Print</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Party</label>
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Billing Party</option>
              {billingParties.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Consol Bill Number</label>
            <input
              type="text"
              value={consolBillNumber}
              onChange={(e) => setConsolBillNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter consol bill number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Searching...' : 'Search Bills'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Search by Billing Party and/or Consol Bill Number</p>
      </div>

      {showResults && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {bills.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No consol bills found for the selected criteria.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Consol Bill No</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Bill Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Billing Party</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Bill From</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount (₹)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bills.map((bill) => (
                  <tr key={bill.tran_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-blue-600">{bill.consol_bill_no}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(bill.consol_bill_date)}</td>
                    <td className="px-4 py-3 text-gray-700">{bill.consol_billing_party}</td>
                    <td className="px-4 py-3 text-gray-700">{bill.bill_from_company || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ₹{formatAmount(bill.consol_bill_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        bill.consol_bill_status === 'Fully Paid'
                          ? 'bg-green-100 text-green-700'
                          : bill.consol_bill_status === 'Partially Paid'
                          ? 'bg-yellow-100 text-yellow-700'
                          : bill.consol_bill_status === 'Submitted'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {bill.consol_bill_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedBillId(bill.tran_id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
