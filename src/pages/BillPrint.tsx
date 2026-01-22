import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Search, Printer, Mail } from 'lucide-react';
import { BillPrintPreview } from '../components/BillPrintPreview';

interface BillingParty {
  billing_party_code: string;
  billing_party_name: string;
}

interface Bill {
  bill_id: string;
  lr_bill_number: string;
  lr_bill_date: string;
  billing_party_name: string;
  bill_amount: number;
}

export default function BillPrint() {
  const [billingParties, setBillingParties] = useState<BillingParty[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingParties();
  }, []);

  const fetchBillingParties = async () => {
    try {
      const { data, error } = await supabase
        .from('lr_bill')
        .select('billing_party_code, billing_party_name')
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
    if (!selectedParty && !billNumber) {
      alert('Please select a billing party or enter a bill number');
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('lr_bill')
        .select('bill_id, lr_bill_number, lr_bill_date, billing_party_name, bill_amount');

      if (billNumber) {
        query = query.ilike('lr_bill_number', `%${billNumber}%`);
      }

      if (selectedParty) {
        query = query.eq('billing_party_code', selectedParty);
      }

      const { data, error } = await query.order('lr_bill_date', { ascending: false });

      if (error) throw error;

      setBills(data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching bills:', error);
      alert('Error searching bills');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (bill: Bill) => {
    setSelectedBillId(bill.bill_id);
  };

  const handleSendEmail = async (bill: Bill) => {
    setSendingEmail(bill.bill_id);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-bill-email`;

      const { data: { session } } = await supabase.auth.getSession();

      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ billId: bill.bill_id }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Email send failed:', response.status, result);
        const errorMsg = result.details ? `${result.error}\n\nDetails: ${result.details}` : (result.error || `Failed to send email (Status: ${response.status})`);
        throw new Error(errorMsg);
      }

      console.log('Email sent successfully:', result);
      alert(`Email sent successfully to customer!\n\n${result.message}`);
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingEmail(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <>
      {selectedBillId && (
        <BillPrintPreview
          billId={selectedBillId}
          onClose={() => setSelectedBillId(null)}
        />
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Bill Print</h1>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Party
              </label>
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Billing Party</option>
                {billingParties.map((party) => (
                  <option key={party.billing_party_code} value={party.billing_party_code}>
                    {party.billing_party_name} ({party.billing_party_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Number
              </label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="Enter bill number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search Bills'}
            </button>

            {showResults && (
              <button
                onClick={() => {
                  setShowResults(false);
                  setBills([]);
                  setSelectedParty('');
                  setBillNumber('');
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Results
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Search by Billing Party and/or Bill Number
          </p>
        </div>
      </div>

      {showResults && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Bills ({bills.length})
            </h2>
          </div>

          {bills.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No bills found for the selected billing party</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billing Party Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bills.map((bill) => (
                    <tr key={bill.bill_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {bill.billing_party_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {bill.lr_bill_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(bill.lr_bill_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₹{(bill.bill_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePrint(bill)}
                            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                            Print
                          </button>
                          <button
                            onClick={() => handleSendEmail(bill)}
                            disabled={sendingEmail === bill.bill_id}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                            {sendingEmail === bill.bill_id ? 'Sending...' : 'Send Mail'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-sm text-gray-700">
                      Total:
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-900">
                      ₹{bills.reduce((sum, bill) => sum + (bill.bill_amount || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}
