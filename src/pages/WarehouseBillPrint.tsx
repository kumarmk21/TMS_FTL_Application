import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Search, Printer, Filter } from 'lucide-react';
import { WarehouseBillPrintPreview } from '../components/WarehouseBillPrintPreview';

interface BillingParty {
  billing_party_code: string;
  billing_party_name: string;
}

interface WarehouseBill {
  bill_id: string;
  bill_number: string;
  bill_date: string;
  billing_party_name: string;
  total_amount: number;
  bill_status: string;
}

export default function WarehouseBillPrint() {
  const [billingParties, setBillingParties] = useState<BillingParty[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [billStatus, setBillStatus] = useState('');
  const [bills, setBills] = useState<WarehouseBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingParties();
  }, []);

  const fetchBillingParties = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_bill')
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
    setLoading(true);
    try {
      let query = supabase
        .from('warehouse_bill')
        .select('bill_id, bill_number, bill_date, billing_party_name, total_amount, bill_status');

      if (billNumber) {
        query = query.ilike('bill_number', `%${billNumber}%`);
      }

      if (selectedParty) {
        query = query.eq('billing_party_code', selectedParty);
      }

      if (fromDate) {
        query = query.gte('bill_date', fromDate);
      }

      if (toDate) {
        query = query.lte('bill_date', toDate);
      }

      if (billStatus) {
        query = query.eq('bill_status', billStatus);
      }

      const { data, error } = await query.order('bill_date', { ascending: false });

      if (error) throw error;

      setBills(data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching warehouse bills:', error);
      alert('Error searching warehouse bills');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (bill: WarehouseBill) => {
    setSelectedBillId(bill.bill_id);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'Cancelled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReset = () => {
    setSelectedParty('');
    setBillNumber('');
    setFromDate('');
    setToDate('');
    setBillStatus('');
    setBills([]);
    setShowResults(false);
  };

  return (
    <>
      {selectedBillId && (
        <WarehouseBillPrintPreview
          billId={selectedBillId}
          onClose={() => setSelectedBillId(null)}
        />
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Warehouse Bill Print</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Number
              </label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="Enter bill number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Party
              </label>
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Parties</option>
                {billingParties.map(party => (
                  <option key={party.billing_party_code} value={party.billing_party_code}>
                    {party.billing_party_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Status
              </label>
              <select
                value={billStatus}
                onChange={(e) => setBillStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {showResults && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Search Results ({bills.length} {bills.length === 1 ? 'bill' : 'bills'} found)
              </h3>
            </div>

            {bills.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No warehouse bills found matching your search criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bill Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bill Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Billing Party
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bills.map((bill) => (
                      <tr key={bill.bill_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{bill.bill_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(bill.bill_date)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{bill.billing_party_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(bill.total_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(bill.bill_status)}`}>
                            {bill.bill_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handlePrint(bill)}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-900"
                          >
                            <Printer className="w-4 h-4" />
                            Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
