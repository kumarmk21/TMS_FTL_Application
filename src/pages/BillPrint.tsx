import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Search, Printer, Mail } from 'lucide-react';
import { BillPrintPreview } from '../components/BillPrintPreview';
import { WarehouseBillPrintPreview } from '../components/WarehouseBillPrintPreview';

interface BillingParty {
  billing_party_code: string;
  billing_party_name: string;
}

interface Bill {
  bill_id: string;
  bill_number: string;
  bill_date: string;
  billing_party_name: string;
  bill_amount: number;
  bill_type: 'lr' | 'warehouse';
}

export default function BillPrint() {
  const [billingParties, setBillingParties] = useState<BillingParty[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billType, setBillType] = useState<'all' | 'lr' | 'warehouse'>('all');
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selectedBillType, setSelectedBillType] = useState<'lr' | 'warehouse' | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingParties();
  }, []);

  const fetchBillingParties = async () => {
    try {
      const [lrResult, warehouseResult] = await Promise.all([
        supabase
          .from('lr_bill')
          .select('billing_party_code, billing_party_name')
          .order('billing_party_name'),
        supabase
          .from('warehouse_bill')
          .select('billing_party_code, billing_party_name')
          .order('billing_party_name')
      ]);

      if (lrResult.error) throw lrResult.error;
      if (warehouseResult.error) throw warehouseResult.error;

      const allParties = [...(lrResult.data || []), ...(warehouseResult.data || [])];

      const uniqueParties = allParties.reduce((acc: BillingParty[], current) => {
        if (!acc.find(p => p.billing_party_code === current.billing_party_code)) {
          acc.push({
            billing_party_code: current.billing_party_code,
            billing_party_name: current.billing_party_name || current.billing_party_code
          });
        }
        return acc;
      }, []);

      setBillingParties(uniqueParties.sort((a, b) => a.billing_party_name.localeCompare(b.billing_party_name)));
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
      const allBills: Bill[] = [];

      if (billType === 'all' || billType === 'lr') {
        let lrQuery = supabase
          .from('lr_bill')
          .select('bill_id, lr_bill_number, lr_bill_date, billing_party_name, bill_amount');

        if (billNumber) {
          lrQuery = lrQuery.ilike('lr_bill_number', `%${billNumber}%`);
        }

        if (selectedParty) {
          lrQuery = lrQuery.eq('billing_party_code', selectedParty);
        }

        const { data, error } = await lrQuery.order('lr_bill_date', { ascending: false });

        if (error) throw error;

        if (data) {
          allBills.push(...data.map(bill => ({
            bill_id: bill.bill_id,
            bill_number: bill.lr_bill_number,
            bill_date: bill.lr_bill_date,
            billing_party_name: bill.billing_party_name,
            bill_amount: bill.bill_amount,
            bill_type: 'lr' as const
          })));
        }
      }

      if (billType === 'all' || billType === 'warehouse') {
        let warehouseQuery = supabase
          .from('warehouse_bill')
          .select('bill_id, bill_number, bill_date, billing_party_name, total_amount');

        if (billNumber) {
          warehouseQuery = warehouseQuery.ilike('bill_number', `%${billNumber}%`);
        }

        if (selectedParty) {
          warehouseQuery = warehouseQuery.eq('billing_party_code', selectedParty);
        }

        const { data, error } = await warehouseQuery.order('bill_date', { ascending: false });

        if (error) throw error;

        if (data) {
          allBills.push(...data.map(bill => ({
            bill_id: bill.bill_id,
            bill_number: bill.bill_number,
            bill_date: bill.bill_date,
            billing_party_name: bill.billing_party_name,
            bill_amount: bill.total_amount,
            bill_type: 'warehouse' as const
          })));
        }
      }

      allBills.sort((a, b) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime());

      setBills(allBills);
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
    setSelectedBillType(bill.bill_type);
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
        body: JSON.stringify({
          billId: bill.bill_id,
          billType: bill.bill_type
        }),
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
      {selectedBillId && selectedBillType === 'lr' && (
        <BillPrintPreview
          billId={selectedBillId}
          onClose={() => {
            setSelectedBillId(null);
            setSelectedBillType(null);
          }}
        />
      )}

      {selectedBillId && selectedBillType === 'warehouse' && (
        <WarehouseBillPrintPreview
          billId={selectedBillId}
          onClose={() => {
            setSelectedBillId(null);
            setSelectedBillType(null);
          }}
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
                Bill Type
              </label>
              <select
                value={billType}
                onChange={(e) => setBillType(e.target.value as 'all' | 'lr' | 'warehouse')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Bills</option>
                <option value="lr">LR Bills Only</option>
                <option value="warehouse">Warehouse Bills Only</option>
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
                  setBillType('all');
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
                      Bill Type
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
                    <tr key={`${bill.bill_type}-${bill.bill_id}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {bill.billing_party_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bill.bill_type === 'lr'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {bill.bill_type === 'lr' ? 'LR Bill' : 'Warehouse Bill'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {bill.bill_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(bill.bill_date)}
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
                    <td colSpan={4} className="px-4 py-3 text-right text-sm text-gray-700">
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
