import { AlertTriangle, Loader2, X } from 'lucide-react';
import type { VendorPayment } from '../pages/VendorPaymentsDashboard';

interface Props {
  payment: VendorPayment;
  posting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const inr = (v: number) =>
  v != null ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export function ConfirmPaymentModal({ payment, posting, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Confirm Payment</h2>
          </div>
          <button onClick={onCancel} disabled={posting} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            You are about to post this payment to Zoho Books. This action cannot be undone.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Vendor</span>
              <span className="font-medium text-gray-900">{payment.vendor_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-gray-900">{inr(payment.bill_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment Type</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${payment.payment_type === 'ATH' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {payment.payment_type}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment Date</span>
              <span className="font-medium text-gray-900">{fmtDate(payment.payment_date)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reference</span>
              <span className="font-medium text-gray-900 text-xs">{payment.reference_number || '-'}</span>
            </div>
            {payment.bill_id && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Linked Bill</span>
                <span className="font-medium text-gray-900 text-xs">{payment.bill_id}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={posting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={posting}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Confirm & Post
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmPaymentModal;
