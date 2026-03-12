import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileText, Loader2 } from 'lucide-react';

interface BillingParty {
  billing_party_code: string;
  billing_party_name: string;
}

interface GeneratedBill {
  tran_id: string;
  bill_no: string;
  bill_date: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  vehicle_number: string;
  lr_financial_status: string;
  billing_party_code: string;
  billing_party_name: string;
}

export default function ConsolidateBillGeneration() {
  const [billingParties, setBillingParties] = useState<BillingParty[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [bills, setBills] = useState<GeneratedBill[]>([]);
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchBillingParties();
  }, []);

  const fetchBillingParties = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('billing_party_code, billing_party_name')
        .not('bill_no', 'is', null)
        .eq('lr_financial_status', 'generated')
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
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('tran_id, bill_no, bill_date, from_city, to_city, vehicle_type, vehicle_number, lr_financial_status, billing_party_code, billing_party_name')
        .eq('billing_party_code', selectedParty)
        .eq('lr_financial_status', 'generated')
        .not('bill_no', 'is', null)
        .order('bill_date', { ascending: true });

      if (error) throw error;

      setBills(data || []);
      setShowResults(true);
      setSelectedBills(new Set());
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

  const handleSubmit = async () => {
    if (selectedBills.size === 0) {
      alert('Please select at least one bill');
      return;
    }

    alert(`Processing ${selectedBills.size} bill(s) for consolidation`);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7" />
          Consolidate Bill Generation
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billing Party <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
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

        <div className="flex gap-3">
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
      </div>

      {showResults && (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle Number
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No bills found for the selected billing party
                      </td>
                    </tr>
                  ) : (
                    bills.map((bill) => (
                      <tr key={bill.tran_id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedBills.has(bill.tran_id)}
                            onChange={() => toggleBillSelection(bill.tran_id)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.bill_no}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.from_city || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.to_city || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.vehicle_type || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.vehicle_number || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {bills.length > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={selectedBills.size === 0}
                className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                Submit ({selectedBills.size} selected)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
