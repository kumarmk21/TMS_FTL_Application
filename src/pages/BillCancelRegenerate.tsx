import { useState, useEffect } from 'react';
import { FileX, RefreshCw, Search, Calendar, DollarSign, AlertCircle, CheckCircle, XCircle, CreditCard as Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BillRecord {
  bill_id: string;
  lr_bill_number: string;
  lr_bill_date: string;
  billing_party_code: string;
  billing_party_name: string;
  bill_amount: number;
  bill_status: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  lr_count: number;
}

interface LRRecord {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  from_city: string;
  to_city: string;
  lr_total_amount: number;
  bill_no: string | null;
  bill_date: string | null;
}

export function BillCancelRegenerate() {
  const { profile } = useAuth();
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null);
  const [lrRecords, setLrRecords] = useState<LRRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('active');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchBills();
  }, [statusFilter]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('lr_bill')
        .select(`
          bill_id,
          lr_bill_number,
          lr_bill_date,
          billing_party_code,
          billing_party_name,
          bill_amount,
          bill_status,
          cancelled_at,
          cancelled_by
        `)
        .order('lr_bill_date', { ascending: false });

      if (statusFilter === 'active') {
        query = query.or('bill_status.is.null,bill_status.neq.Cancelled');
      } else if (statusFilter === 'cancelled') {
        query = query.eq('bill_status', 'Cancelled');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bills:', error);
        throw error;
      }

      const billsWithCount = await Promise.all(
        (data || []).map(async (bill) => {
          const { count, error: countError } = await supabase
            .from('booking_lr')
            .select('*', { count: 'exact', head: true })
            .eq('bill_no', bill.lr_bill_number);

          if (countError) {
            console.error('Error counting LRs:', countError);
          }

          return {
            ...bill,
            lr_count: count || 0,
          };
        })
      );

      setBills(billsWithCount);
    } catch (error: any) {
      console.error('Error fetching bills:', error);
      alert(`Failed to fetch bills: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLRsForBill = async (billNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('tran_id, manual_lr_no, lr_date, from_city, to_city, lr_total_amount, bill_no, bill_date')
        .eq('bill_no', billNumber)
        .order('manual_lr_no', { ascending: true });

      if (error) throw error;
      setLrRecords(data || []);
    } catch (error) {
      console.error('Error fetching LRs:', error);
    }
  };

  const handleViewBill = async (bill: BillRecord) => {
    setSelectedBill(bill);
    await fetchLRsForBill(bill.lr_bill_number);
  };

  const handleCancelBill = async () => {
    if (!selectedBill || !cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    setLoading(true);
    try {
      const { error: billError } = await supabase
        .from('lr_bill')
        .update({
          bill_status: 'Cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: profile?.id,
          cancellation_reason: cancelReason.trim(),
        })
        .eq('bill_id', selectedBill.bill_id);

      if (billError) {
        console.error('Bill update error:', billError);
        throw billError;
      }

      const { error: lrError } = await supabase
        .from('booking_lr')
        .update({
          bill_no: null,
          bill_date: null,
          bill_due_date: null,
        })
        .eq('bill_no', selectedBill.lr_bill_number);

      if (lrError) {
        console.error('LR update error:', lrError);
        throw lrError;
      }

      alert('Bill cancelled successfully. All LRs are now available for re-billing.');
      setShowCancelConfirm(false);
      setCancelReason('');
      setSelectedBill(null);
      setLrRecords([]);
      fetchBills();
    } catch (error: any) {
      console.error('Error cancelling bill:', error);
      alert(`Failed to cancel bill: ${error.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBill = async () => {
    if (!selectedBill) return;

    setLoading(true);
    try {
      const { data: lrData, error: lrFetchError } = await supabase
        .from('booking_lr')
        .select('tran_id, lr_total_amount')
        .eq('bill_no', selectedBill.lr_bill_number);

      if (lrFetchError) throw lrFetchError;

      if (!lrData || lrData.length === 0) {
        alert('No LRs found for this bill');
        return;
      }

      const totalAmount = lrData.reduce((sum, lr) => sum + (lr.lr_total_amount || 0), 0);

      const { data: currentBill } = await supabase
        .from('lr_bill')
        .select('*')
        .eq('bill_id', selectedBill.bill_id)
        .single();

      if (!currentBill) {
        alert('Bill not found');
        return;
      }

      const { error: oldBillError } = await supabase
        .from('lr_bill')
        .update({
          bill_status: 'Regenerated',
          cancelled_at: new Date().toISOString(),
          cancelled_by: profile?.id,
          original_bill_id: selectedBill.bill_id,
        })
        .eq('bill_id', selectedBill.bill_id);

      if (oldBillError) throw oldBillError;

      const { error: lrUnlinkError } = await supabase
        .from('booking_lr')
        .update({
          bill_no: null,
          bill_date: null,
          bill_due_date: null,
        })
        .eq('bill_no', selectedBill.lr_bill_number);

      if (lrUnlinkError) throw lrUnlinkError;

      const { data: newBill, error: newBillError } = await supabase
        .from('lr_bill')
        .insert({
          lr_bill_date: new Date().toISOString().split('T')[0],
          billing_party_code: currentBill.billing_party_code,
          billing_party_name: currentBill.billing_party_name,
          bill_to_gstin: currentBill.bill_to_gstin,
          bill_to_address: currentBill.bill_to_address,
          bill_to_state: currentBill.bill_to_state,
          bill_generation_branch: currentBill.bill_generation_branch,
          bill_amount: totalAmount,
          sub_total: totalAmount,
          sac_code: currentBill.sac_code,
          sac_description: currentBill.sac_description,
          bill_status: 'Active',
          created_by: profile?.id,
        })
        .select()
        .single();

      if (newBillError) throw newBillError;

      const { error: lrUpdateError } = await supabase
        .from('booking_lr')
        .update({
          bill_no: newBill.lr_bill_number,
          bill_date: newBill.lr_bill_date,
          bill_due_date: newBill.lr_bill_due_date,
        })
        .in('tran_id', lrData.map(lr => lr.tran_id));

      if (lrUpdateError) throw lrUpdateError;

      alert(`Bill regenerated successfully! New Bill Number: ${newBill.lr_bill_number}`);
      setShowRegenerateConfirm(false);
      setSelectedBill(null);
      setLrRecords([]);
      fetchBills();
    } catch (error) {
      console.error('Error regenerating bill:', error);
      alert('Failed to regenerate bill');
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(bill =>
    (bill.lr_bill_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bill.billing_party_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bill.billing_party_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bill Cancellation & Regeneration</h1>
          <p className="text-gray-600 mt-1">Cancel bills and regenerate with updated freight charges</p>
        </div>
        <RefreshCw className="w-8 h-8 text-red-600" />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by bill number, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Bills</option>
            <option value="active">Active Bills</option>
            <option value="cancelled">Cancelled Bills</option>
          </select>

          <button
            onClick={fetchBills}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bill Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">LRs</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading bills...
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No bills found
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.bill_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{bill.lr_bill_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(bill.lr_bill_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="font-medium">{bill.billing_party_name}</div>
                      <div className="text-xs text-gray-500">{bill.billing_party_code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(bill.bill_amount || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">{bill.lr_count}</td>
                    <td className="px-4 py-3 text-center">
                      {bill.bill_status === 'Cancelled' || bill.bill_status === 'Regenerated' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />
                          {bill.bill_status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewBill(bill)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Bill Details - {selectedBill.lr_bill_number}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedBill.billing_party_name} | {formatDate(selectedBill.lr_bill_date)}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedBill(null);
                  setLrRecords([]);
                  setShowCancelConfirm(false);
                  setShowRegenerateConfirm(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedBill.bill_amount || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">LR Count</p>
                  <p className="text-lg font-bold text-gray-900">{selectedBill.lr_count}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">LR Records</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">LR Number</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Route</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {lrRecords.map((lr) => (
                        <tr key={lr.tran_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{lr.manual_lr_no}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{formatDate(lr.lr_date)}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {lr.from_city} → {lr.to_city}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(lr.lr_total_amount || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedBill.bill_status !== 'Cancelled' && selectedBill.bill_status !== 'Regenerated' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-900 mb-2">Bill Cancellation Workflow</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
                        <li>Cancel this bill (LRs will be unlinked)</li>
                        <li>Edit freight charges in LR Financial Edit module</li>
                        <li>Regenerate bill with updated charges</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {selectedBill.bill_status !== 'Cancelled' && selectedBill.bill_status !== 'Regenerated' && (
                  <>
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <FileX className="w-5 h-5" />
                      Cancel Bill
                    </button>
                    <button
                      onClick={() => setShowRegenerateConfirm(true)}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Regenerate Bill
                    </button>
                  </>
                )}
              </div>

              {showCancelConfirm && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800 font-medium mb-3">
                      Are you sure you want to cancel this bill? This action will:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700 mb-4">
                      <li>Mark the bill as cancelled</li>
                      <li>Unlink all LRs from this bill</li>
                      <li>Make LRs available for re-billing</li>
                    </ul>
                    <textarea
                      placeholder="Enter cancellation reason (required)"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowCancelConfirm(false);
                        setCancelReason('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCancelBill}
                      disabled={loading || !cancelReason.trim()}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Confirm Cancellation
                    </button>
                  </div>
                </div>
              )}

              {showRegenerateConfirm && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium mb-3">
                      Regenerate bill with current LR amounts? This will:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                      <li>Mark current bill as "Regenerated"</li>
                      <li>Create a new bill with a new bill number</li>
                      <li>Use updated freight amounts from LRs</li>
                      <li>Link all LRs to the new bill</li>
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRegenerateConfirm(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRegenerateBill}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Confirm Regeneration
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
