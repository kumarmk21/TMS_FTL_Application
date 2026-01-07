import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileText, Calendar, DollarSign, CheckSquare } from 'lucide-react';
import GenerateBillModal from '../components/modals/GenerateBillModal';

interface BillingParty {
  billing_party_code: string;
  billing_party_name: string;
}

interface UnbilledLR {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  billing_party_code: string;
  billing_party_name: string;
  bill_to_gstin: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  chrg_wt: number;
  lr_total_amount: number;
  freight_amount: number;
  booking_branch: string;
}

export default function GenerateCustomerBill() {
  const [billingParties, setBillingParties] = useState<BillingParty[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [unbilledLRs, setUnbilledLRs] = useState<UnbilledLR[]>([]);
  const [selectedLRs, setSelectedLRs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => {
    fetchBillingParties();
  }, []);

  const fetchBillingParties = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('billing_party_code, billing_party_name')
        .is('bill_no', null)
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
    if (!fromDate || !toDate) {
      alert('Please select both from and to dates');
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('booking_lr')
        .select('*')
        .eq('billing_party_code', selectedParty)
        .is('bill_no', null)
        .gte('lr_date', fromDate)
        .lte('lr_date', toDate)
        .order('lr_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      setUnbilledLRs(data || []);
      setShowResults(true);
      setSelectedLRs(new Set());
    } catch (error) {
      console.error('Error searching LRs:', error);
      alert('Error searching unbilled LRs');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedLRs.size === unbilledLRs.length) {
      setSelectedLRs(new Set());
    } else {
      setSelectedLRs(new Set(unbilledLRs.map(lr => lr.tran_id)));
    }
  };

  const handleSelectLR = (tranId: string) => {
    const newSelected = new Set(selectedLRs);
    if (newSelected.has(tranId)) {
      newSelected.delete(tranId);
    } else {
      newSelected.add(tranId);
    }
    setSelectedLRs(newSelected);
  };

  const calculateTotalAmount = () => {
    return unbilledLRs
      .filter(lr => selectedLRs.has(lr.tran_id))
      .reduce((sum, lr) => sum + (lr.lr_total_amount || 0), 0);
  };

  const handleGenerateBill = () => {
    if (selectedLRs.size === 0) {
      alert('Please select at least one LR to generate bill');
      return;
    }
    setShowBillModal(true);
  };

  const getSelectedLRsData = () => {
    return unbilledLRs
      .filter(lr => selectedLRs.has(lr.tran_id))
      .map(lr => ({
        tran_id: lr.tran_id,
        billing_party_code: lr.billing_party_code,
        billing_party_name: lr.billing_party_name,
        freight_amount: lr.freight_amount || 0,
        manual_lr_no: lr.manual_lr_no,
        lr_date: lr.lr_date,
        from_city: lr.from_city,
        to_city: lr.to_city,
        vehicle_type: lr.vehicle_type,
        chrg_wt: lr.chrg_wt,
        lr_total_amount: lr.lr_total_amount,
      }));
  };

  const handleBillGenerated = () => {
    setUnbilledLRs(unbilledLRs.filter(lr => !selectedLRs.has(lr.tran_id)));
    setSelectedLRs(new Set());
    fetchBillingParties();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Generate Customer Bill</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billing Party *
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Searching...' : 'Search Unbilled LRs'}
          </button>

          {showResults && (
            <button
              onClick={() => {
                setShowResults(false);
                setUnbilledLRs([]);
                setSelectedLRs(new Set());
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Results
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Unbilled LRs ({unbilledLRs.length})
            </h2>
            {unbilledLRs.length > 0 && (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectedLRs.size === unbilledLRs.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedLRs.size > 0 && (
                  <>
                    <div className="text-lg font-semibold text-gray-700">
                      Total: ₹{calculateTotalAmount().toFixed(2)}
                    </div>
                    <button
                      onClick={handleGenerateBill}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <DollarSign className="w-4 h-4" />
                      Generate Bill ({selectedLRs.size})
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {unbilledLRs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No unbilled LRs found for the selected criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedLRs.size === unbilledLRs.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      LR No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      LR Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From - To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight (KG)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unbilledLRs.map((lr) => (
                    <tr
                      key={lr.tran_id}
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedLRs.has(lr.tran_id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedLRs.has(lr.tran_id)}
                          onChange={() => handleSelectLR(lr.tran_id)}
                          className="w-4 h-4 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lr.manual_lr_no}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(lr.lr_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {lr.from_city} - {lr.to_city}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {lr.vehicle_type || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {lr.chrg_wt || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₹{(lr.lr_total_amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right text-sm text-gray-700">
                      Selected Total:
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ₹{calculateTotalAmount().toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      <GenerateBillModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        selectedLRs={getSelectedLRsData()}
        onBillGenerated={handleBillGenerated}
      />
    </div>
  );
}
