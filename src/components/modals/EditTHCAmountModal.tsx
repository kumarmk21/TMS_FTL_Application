import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2 } from 'lucide-react';

interface EditTHCAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  thcId: string;
  thcNumber: string;
  currentAmount: number;
}

export function EditTHCAmountModal({
  isOpen,
  onClose,
  onSuccess,
  thcId,
  thcNumber,
  currentAmount,
}: EditTHCAmountModalProps) {
  const [amount, setAmount] = useState(currentAmount);
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState({
    thc_loading_charges: 0,
    thc_detention_charges: 0,
    thc_advance_amount: 0,
    thc_tds_amount: 0,
  thc_gross_amount: 0,
    thc_net_payable_amount: 0,
    thc_balance_amount: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setAmount(currentAmount);
      fetchExistingRecord();
    }
  }, [isOpen, currentAmount, thcId]);

  const fetchExistingRecord = async () => {
    try {
      const { data, error } = await supabase
        .from('thc_details')
        .select('thc_loading_charges, thc_detention_charges, thc_advance_amount, thc_tds_amount, thc_gross_amount, thc_net_payable_amount, thc_balance_amount')
        .eq('thc_id', thcId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setExisting({
          thc_loading_charges: Number(data.thc_loading_charges || 0),
          thc_detention_charges: Number(data.thc_detention_charges || 0),
          thc_advance_amount: Number(data.thc_advance_amount || 0),
          thc_tds_amount: Number(data.thc_tds_amount || 0),
          thc_gross_amount: Number(data.thc_gross_amount || 0),
          thc_net_payable_amount: Number(data.thc_net_payable_amount || 0),
          thc_balance_amount: Number(data.thc_balance_amount || 0),
        });
      }
    } catch (error) {
      console.error('Error fetching existing THC record:', error);
    }
  };

  if (!isOpen) return null;

  const newGrossAmount = amount + existing.thc_loading_charges + existing.thc_detention_charges;
  const newNetPayable = newGrossAmount;
  const newBalance = newGrossAmount - existing.thc_advance_amount - existing.thc_tds_amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      alert('THC amount must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('thc_details')
        .update({
          thc_amount: amount,
          thc_gross_amount: newGrossAmount,
          thc_net_payable_amount: newNetPayable,
          thc_balance_amount: newBalance,
        })
        .eq('thc_id', thcId);

      if (error) throw error;

      alert(`THC ${thcNumber} amount updated to ₹${amount.toFixed(2)} successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating THC amount:', error);
      alert(`Error updating THC amount: ${error?.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Edit THC Amount</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              THC Number
            </label>
            <input
              type="text"
              value={thcNumber}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              THC Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Current amount: ₹{currentAmount.toFixed(2)}
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Recalculated Values</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Gross Amount:</span>
              <span className="font-medium text-gray-900">₹{newGrossAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Net Payable:</span>
              <span className="font-medium text-gray-900">₹{newNetPayable.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Balance Amount:</span>
              <span className="font-medium text-gray-900">₹{newBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Advance Amount (unchanged):</span>
              <span className="font-medium text-gray-900">₹{existing.thc_advance_amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Amount
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
