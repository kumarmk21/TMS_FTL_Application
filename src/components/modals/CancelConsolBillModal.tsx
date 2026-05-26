import { useState } from 'react';
import { Ban, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CancelConsolBillModalProps {
  billId: string;
  billNo: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelConsolBillModal({
  billId,
  billNo,
  isOpen,
  onClose,
  onSuccess,
}: CancelConsolBillModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCancel = async () => {
    setStatus('processing');
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('consol_bill_data')
        .update({
          consol_bill_status: 'Cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id ?? null,
          cancellation_reason: reason.trim() || null,
        })
        .eq('tran_id', billId);

      if (error) throw error;

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setReason('');
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      setStatus('error');
    }
  };

  const handleClose = () => {
    if (status === 'processing') return;
    setStatus('idle');
    setErrorMsg('');
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Cancel Consolidated Bill</h2>
              <p className="text-xs text-gray-500">{billNo}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={status === 'processing'}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              This will mark the bill as <strong>Cancelled</strong>. The original bill data will be
              preserved for audit purposes. This action cannot be undone.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Cancellation Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={status === 'processing' || status === 'success'}
              placeholder="Enter a reason for cancellation..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {status === 'error' && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">Bill cancelled successfully.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={handleClose}
            disabled={status === 'processing'}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={handleCancel}
            disabled={status === 'processing' || status === 'success'}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Ban className="w-4 h-4" />
            )}
            {status === 'processing' ? 'Cancelling...' : 'Cancel Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}
