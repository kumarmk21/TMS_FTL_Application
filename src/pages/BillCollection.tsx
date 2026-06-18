import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import html2pdf from 'html2pdf.js';
import { Search, Calendar, X, Receipt, CreditCard as Edit2, XCircle, CheckCircle, Clock, Loader2, IndianRupee, FileText, Download, Mail, Eye, RefreshCw, Truck, Building2, AlertCircle, CreditCard, Filter } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BillRow {
  bill_id: string;
  bill_number: string;
  bill_type: 'lr' | 'warehouse';
  billing_party_name: string;
  billing_party_code: string;
  bill_amount: number;
  bill_date: string;
  bill_due_date: string | null;
  bill_status: string;
}

interface PaymentReceipt {
  pr_id: string;
  pr_number: string;
  bill_id: string;
  bill_type: 'lr' | 'warehouse';
  bill_number: string;
  billing_party_name: string;
  billing_party_code: string;
  bill_amount: number;
  payment_amount: number;
  payment_date: string;
  payment_mode: string;
  reference_number: string | null;
  remarks: string | null;
  is_cancelled: boolean;
  created_at: string;
}

interface PRFormData {
  payment_amount: string;
  payment_date: string;
  payment_mode: string;
  reference_number: string;
  remarks: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().split('T')[0];
const firstOfMonthStr = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
})();

const fmt = (val: number | null | undefined) =>
  val != null
    ? `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : '-';

const fmtDate = (val: string | null | undefined) =>
  val
    ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

const isOverdue = (dueDate: string | null) =>
  dueDate ? new Date(dueDate) < new Date() : false;

// ─── PaymentReceiptModal ──────────────────────────────────────────────────────

function PaymentReceiptModal({
  bill,
  onClose,
  onSave,
  saving,
}: {
  bill: BillRow;
  onClose: () => void;
  onSave: (data: PRFormData) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<PRFormData>({
    payment_amount: bill.bill_amount?.toString() ?? '',
    payment_date: todayStr,
    payment_mode: 'Bank Transfer',
    reference_number: '',
    remarks: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" /> Payment Receipt
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {bill.bill_number} · {bill.billing_party_name}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between border border-blue-100">
            <span className="text-sm text-blue-600 font-medium">Bill Amount</span>
            <span className="text-base font-bold text-blue-800">{fmt(bill.bill_amount)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={form.payment_amount}
                  onChange={e => setForm(f => ({ ...f, payment_amount: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={form.payment_mode}
                onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {['Cash', 'Cheque', 'Bank Transfer', 'UPI'].map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Reference Number
              </label>
              <input
                type="text"
                value={form.reference_number}
                onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
                placeholder="Cheque / UTR / Transaction ID"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
              <textarea
                value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.payment_amount || !form.payment_date}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EditPRModal ──────────────────────────────────────────────────────────────

function EditPRModal({
  pr,
  bill,
  onClose,
  onSave,
  saving,
}: {
  pr: PaymentReceipt;
  bill: BillRow;
  onClose: () => void;
  onSave: (data: PRFormData) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<PRFormData>({
    payment_amount: pr.payment_amount?.toString() ?? '',
    payment_date: pr.payment_date,
    payment_mode: pr.payment_mode,
    reference_number: pr.reference_number ?? '',
    remarks: pr.remarks ?? '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-600" /> Edit Payment Receipt
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {pr.pr_number} · {bill.bill_number} · {bill.billing_party_name}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={form.payment_amount}
                  onChange={e => setForm(f => ({ ...f, payment_amount: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Mode</label>
              <select
                value={form.payment_mode}
                onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
              >
                {['Cash', 'Cheque', 'Bank Transfer', 'UPI'].map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reference Number</label>
              <input
                type="text"
                value={form.reference_number}
                onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
                placeholder="Cheque / UTR / Transaction ID"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
              <textarea
                value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.payment_amount || !form.payment_date}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Update Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmCancelPRModal ─────────────────────────────────────────────────────

function ConfirmCancelPRModal({
  pr,
  bill,
  onClose,
  onConfirm,
  saving,
}: {
  pr: PaymentReceipt;
  bill: BillRow;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 bg-red-100 rounded-full p-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Cancel Payment Receipt</h2>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to cancel receipt <span className="font-semibold text-gray-800">{pr.pr_number}</span>?
              </p>
              <div className="mt-3 bg-gray-50 rounded-lg px-4 py-3 space-y-1 border border-gray-200">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Bill Number</span>
                  <span className="font-semibold text-gray-700">{bill.bill_number}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-semibold text-gray-700">{bill.billing_party_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Payment Amount</span>
                  <span className="font-semibold text-gray-700">{fmt(pr.payment_amount)}</span>
                </div>
              </div>
              <p className="text-xs text-red-600 mt-3 font-medium">
                This will reset the bill status to Pending for Collection.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Keep Receipt
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Cancel Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PaymentReceiptViewModal ──────────────────────────────────────────────────

function PaymentReceiptViewModal({
  pr,
  onClose,
}: {
  pr: PaymentReceipt;
  onClose: () => void;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!receiptRef.current) return;
    html2pdf()
      .set({
        margin: 10,
        filename: `${pr.pr_number}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(receiptRef.current)
      .save();
  };

  const handleSendMail = () => {
    alert(`Send mail functionality for ${pr.pr_number} — coming soon.`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Payment Receipt — {pr.pr_number}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendMail}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> Send Mail
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <div ref={receiptRef} className="bg-white border border-gray-200 rounded-xl p-8 max-w-xl mx-auto">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">DLS Logistics</h1>
              <p className="text-xs text-gray-500 mt-0.5">Delivering Logistics Solutions</p>
              <h2 className="text-sm font-bold text-gray-700 mt-3 uppercase tracking-widest">Payment Receipt</h2>
            </div>

            {/* PR Number & Date */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Receipt No.</p>
                <p className="text-lg font-black text-gray-900">{pr.pr_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Payment Date</p>
                <p className="text-sm font-bold text-gray-800">{fmtDate(pr.payment_date)}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-3">
              {[
                ['Bill Number', pr.bill_number],
                ['Bill Type', pr.bill_type === 'lr' ? 'Transportation' : 'Warehouse'],
                ['Customer Name', pr.billing_party_name],
                ['Bill Amount', fmt(pr.bill_amount)],
                ['Payment Mode', pr.payment_mode],
                ...(pr.reference_number ? [['Reference Number', pr.reference_number]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}</span>
                  <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Payment Amount — prominent */}
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 mb-6 text-center">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Amount Received</p>
              <p className="text-3xl font-black text-emerald-800">{fmt(pr.payment_amount)}</p>
            </div>

            {/* Remarks */}
            {pr.remarks && (
              <div className="mb-6">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Remarks</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">{pr.remarks}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Generated: {new Date(pr.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <p className="text-xs text-gray-400">DLS Logistics — Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BillViewModal ────────────────────────────────────────────────────────────

function BillViewModal({
  bill,
  pr,
  onClose,
}: {
  bill: BillRow;
  pr: PaymentReceipt | undefined;
  onClose: () => void;
}) {
  const isCollected = !!pr;
  const overdue = isOverdue(bill.bill_due_date) && !isCollected;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Eye className="w-5 h-5 text-teal-600" /> Bill Details
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Header info */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Bill Number</p>
              <p className="text-xl font-black text-gray-900">{bill.bill_number}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${bill.bill_type === 'lr' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {bill.bill_type === 'lr' ? <Truck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                {bill.bill_type === 'lr' ? 'Transportation' : 'Warehouse'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isCollected ? 'bg-emerald-100 text-emerald-700' : overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {isCollected ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {isCollected ? 'Collected' : overdue ? 'Overdue' : 'Pending'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Customer', value: bill.billing_party_name, span: 2 },
              { label: 'Bill Amount', value: fmt(bill.bill_amount) },
              { label: 'Bill Date', value: fmtDate(bill.bill_date) },
              { label: 'Due Date', value: fmtDate(bill.bill_due_date), red: overdue },
              { label: 'Bill Status', value: bill.bill_status || '-' },
            ].map(({ label, value, span, red }) => (
              <div key={label} className={`bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 ${span === 2 ? 'col-span-2' : ''}`}>
                <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
                <p className={`text-sm font-semibold ${red ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
              </div>
            ))}
          </div>

          {pr && (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Payment Received
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['PR Number', pr.pr_number],
                  ['Payment Date', fmtDate(pr.payment_date)],
                  ['Amount Paid', fmt(pr.payment_amount)],
                  ['Payment Mode', pr.payment_mode],
                  ...(pr.reference_number ? [['Reference', pr.reference_number]] : []),
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs text-emerald-500 font-medium">{l}</p>
                    <p className="text-xs font-semibold text-emerald-800">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main BillCollection ──────────────────────────────────────────────────────

export function BillCollection() {
  const { user } = useAuth();

  // Search state
  const [fromDate, setFromDate] = useState(firstOfMonthStr);
  const [toDate, setToDate] = useState(todayStr);
  const [billTypeFilter, setBillTypeFilter] = useState<'all' | 'lr' | 'warehouse'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'collected'>('all');
  const [billNumberInput, setBillNumberInput] = useState('');
  const [billingPartyFilter, setBillingPartyFilter] = useState('');

  // Customers for dropdown
  const [customers, setCustomers] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    supabase
      .from('customer_master')
      .select('customer_code, customer_name')
      .order('customer_name')
      .then(({ data }) => {
        if (data) {
          setCustomers(data.map((c: any) => ({ code: c.customer_code, name: c.customer_name })));
        }
      });
  }, []);

  // Results state
  const [bills, setBills] = useState<BillRow[]>([]);
  const [prMap, setPrMap] = useState<Record<string, PaymentReceipt>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Modal state
  const [prModalBill, setPrModalBill] = useState<BillRow | null>(null);
  const [editPrBill, setEditPrBill] = useState<BillRow | null>(null);
  const [cancelPrBill, setCancelPrBill] = useState<BillRow | null>(null);
  const [viewPrData, setViewPrData] = useState<PaymentReceipt | null>(null);
  const [viewBillData, setViewBillData] = useState<BillRow | null>(null);
  const [saving, setSaving] = useState(false);

  const handleReset = () => {
    setFromDate(firstOfMonthStr);
    setToDate(todayStr);
    setBillTypeFilter('all');
    setStatusFilter('all');
    setBillNumberInput('');
    setBillingPartyFilter('');
    setBills([]);
    setPrMap({});
    setSearched(false);
  };

  const handleSearch = async () => {
    if (!fromDate || !toDate) {
      alert('Please select a date range.');
      return;
    }
    try {
      setLoading(true);
      setBills([]);
      setPrMap({});

      const billNums = billNumberInput
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

      // Fetch LR bills and WH bills in parallel
      const [lrResult, whResult] = await Promise.all([
        (billTypeFilter === 'all' || billTypeFilter === 'lr')
          ? (() => {
              let q = supabase
                .from('lr_bill')
                .select('bill_id, lr_bill_number, lr_bill_date, lr_bill_due_date, billing_party_name, billing_party_code, bill_amount, lr_bill_status, bill_status')
                .gte('lr_bill_date', fromDate)
                .lte('lr_bill_date', toDate)
                .neq('bill_status', 'Cancelled')
                .neq('bill_status', 'Regenerated');
              if (billingPartyFilter) q = q.eq('billing_party_code', billingPartyFilter);
              return q.order('lr_bill_date', { ascending: false });
            })()
          : Promise.resolve({ data: [], error: null }),
        (billTypeFilter === 'all' || billTypeFilter === 'warehouse')
          ? (() => {
              let q = supabase
                .from('warehouse_bill')
                .select('bill_id, bill_number, bill_date, bill_due_date, billing_party_name, billing_party_code, total_amount, bill_status')
                .gte('bill_date', fromDate)
                .lte('bill_date', toDate)
                .neq('bill_status', 'Cancelled');
              if (billingPartyFilter) q = q.eq('billing_party_code', billingPartyFilter);
              return q.order('bill_date', { ascending: false });
            })()
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (lrResult.error) throw lrResult.error;
      if (whResult.error) throw whResult.error;

      // Normalize LR bills
      const lrBills: BillRow[] = (lrResult.data || []).map((r: any) => ({
        bill_id: r.bill_id,
        bill_number: r.lr_bill_number || '-',
        bill_type: 'lr' as const,
        billing_party_name: r.billing_party_name || '-',
        billing_party_code: r.billing_party_code || '',
        bill_amount: r.bill_amount ?? 0,
        bill_date: r.lr_bill_date,
        bill_due_date: r.lr_bill_due_date ?? null,
        bill_status: r.lr_bill_status || 'Draft',
      }));

      // Normalize WH bills
      const whBills: BillRow[] = (whResult.data || []).map((r: any) => ({
        bill_id: r.bill_id,
        bill_number: r.bill_number || '-',
        bill_type: 'warehouse' as const,
        billing_party_name: r.billing_party_name || '-',
        billing_party_code: r.billing_party_code || '',
        bill_amount: r.total_amount ?? 0,
        bill_date: r.bill_date,
        bill_due_date: r.bill_due_date ?? null,
        bill_status: r.bill_status || 'Draft',
      }));

      let allBills = [...lrBills, ...whBills];

      // Apply bill number filter
      if (billNums.length > 0) {
        allBills = allBills.filter(b =>
          billNums.some(n => b.bill_number.toUpperCase().includes(n))
        );
      }

      // Sort by bill_date descending
      allBills.sort((a, b) => (a.bill_date < b.bill_date ? 1 : -1));

      // Fetch payment receipts for all bill_ids
      const allBillIds = allBills.map(b => b.bill_id);
      const newPrMap: Record<string, PaymentReceipt> = {};

      if (allBillIds.length > 0) {
        const { data: prData, error: prError } = await supabase
          .from('payment_receipts')
          .select('*')
          .in('bill_id', allBillIds)
          .eq('is_cancelled', false);

        if (prError) throw prError;

        (prData || []).forEach((pr: any) => {
          newPrMap[pr.bill_id] = pr as PaymentReceipt;
        });
      }

      // Apply status filter
      let filtered = allBills;
      if (statusFilter === 'pending') {
        filtered = allBills.filter(b => !newPrMap[b.bill_id]);
      } else if (statusFilter === 'collected') {
        filtered = allBills.filter(b => !!newPrMap[b.bill_id]);
      }

      setBills(filtered);
      setPrMap(newPrMap);
      setSearched(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePR = async (formData: PRFormData) => {
    if (!prModalBill) return;
    setSaving(true);
    try {
      const insertPayload = {
        bill_id: prModalBill.bill_id,
        bill_type: prModalBill.bill_type,
        bill_number: prModalBill.bill_number,
        billing_party_code: prModalBill.billing_party_code,
        billing_party_name: prModalBill.billing_party_name,
        bill_amount: prModalBill.bill_amount,
        payment_amount: parseFloat(formData.payment_amount),
        payment_date: formData.payment_date,
        payment_mode: formData.payment_mode,
        reference_number: formData.reference_number || null,
        remarks: formData.remarks || null,
        is_cancelled: false,
        created_by: user?.id,
      };

      const { data: prData, error: prError } = await supabase
        .from('payment_receipts')
        .insert(insertPayload)
        .select()
        .single();

      if (prError) throw prError;

      // Update the source bill table's MR fields
      if (prModalBill.bill_type === 'lr') {
        await supabase
          .from('lr_bill')
          .update({
            lr_bill_mr_number: prData.pr_number,
            lr_bill_mr_date: formData.payment_date,
            lr_bill_status: 'Paid',
          })
          .eq('bill_id', prModalBill.bill_id);
      } else {
        await supabase
          .from('warehouse_bill')
          .update({
            mr_number: prData.pr_number,
            mr_date: formData.payment_date,
            bill_status: 'Paid',
          })
          .eq('bill_id', prModalBill.bill_id);
      }

      // Update local state
      setPrMap(prev => ({ ...prev, [prModalBill.bill_id]: prData as PaymentReceipt }));
      setBills(prev =>
        prev.map(b => b.bill_id === prModalBill.bill_id ? { ...b, bill_status: 'Paid' } : b)
      );
      setPrModalBill(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save payment receipt');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPR = async (formData: PRFormData) => {
    if (!editPrBill) return;
    const existingPr = prMap[editPrBill.bill_id];
    if (!existingPr) return;
    setSaving(true);
    try {
      const { data: updated, error } = await supabase
        .from('payment_receipts')
        .update({
          payment_amount: parseFloat(formData.payment_amount),
          payment_date: formData.payment_date,
          payment_mode: formData.payment_mode,
          reference_number: formData.reference_number || null,
          remarks: formData.remarks || null,
          updated_at: new Date().toISOString(),
        })
        .eq('pr_id', existingPr.pr_id)
        .select()
        .single();

      if (error) throw error;

      // Sync MR date on bill table if date changed
      if (formData.payment_date !== existingPr.payment_date) {
        if (editPrBill.bill_type === 'lr') {
          await supabase
            .from('lr_bill')
            .update({ lr_bill_mr_date: formData.payment_date })
            .eq('bill_id', editPrBill.bill_id);
        } else {
          await supabase
            .from('warehouse_bill')
            .update({ mr_date: formData.payment_date })
            .eq('bill_id', editPrBill.bill_id);
        }
      }

      setPrMap(prev => ({ ...prev, [editPrBill.bill_id]: updated as PaymentReceipt }));
      setEditPrBill(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update receipt');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPR = async () => {
    if (!cancelPrBill) return;
    const existingPr = prMap[cancelPrBill.bill_id];
    if (!existingPr) return;
    setSaving(true);
    try {
      const { error: prError } = await supabase
        .from('payment_receipts')
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('pr_id', existingPr.pr_id);

      if (prError) throw prError;

      // Reset MR fields on the source bill table
      if (cancelPrBill.bill_type === 'lr') {
        await supabase
          .from('lr_bill')
          .update({
            lr_bill_mr_number: null,
            lr_bill_mr_date: null,
            lr_bill_status: 'Submitted',
          })
          .eq('bill_id', cancelPrBill.bill_id);
      } else {
        await supabase
          .from('warehouse_bill')
          .update({
            mr_number: null,
            mr_date: null,
            bill_status: 'Submitted',
          })
          .eq('bill_id', cancelPrBill.bill_id);
      }

      // Remove from prMap; update bill status in local state
      setPrMap(prev => {
        const next = { ...prev };
        delete next[cancelPrBill.bill_id];
        return next;
      });
      setBills(prev =>
        prev.map(b => b.bill_id === cancelPrBill.bill_id ? { ...b, bill_status: 'Submitted' } : b)
      );
      setCancelPrBill(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to cancel receipt');
    } finally {
      setSaving(false);
    }
  };

  const totalBillAmount = bills.reduce((sum, b) => sum + (b.bill_amount || 0), 0);
  const pendingCount = bills.filter(b => !prMap[b.bill_id]).length;
  const collectedCount = bills.filter(b => !!prMap[b.bill_id]).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bill Collection</h1>
        <p className="mt-1 text-sm text-gray-500">Track and manage payment collection for Transportation and Warehouse bills</p>
      </div>

      {/* Search Panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Filter className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Search Criteria</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* From Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">From Date <span className="text-red-500">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">To Date <span className="text-red-500">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Collection Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Collection Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All</option>
              <option value="pending">Pending for Collection</option>
              <option value="collected">Collected Bills</option>
            </select>
          </div>

          {/* Billing Party */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Billing Party</label>
            <select
              value={billingPartyFilter}
              onChange={e => setBillingPartyFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Parties</option>
              {customers.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Bill Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bill Number(s)</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={billNumberInput}
                onChange={e => setBillNumberInput(e.target.value)}
                placeholder="e.g. 29100001, 29100002"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Bill Type Filter */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs font-semibold text-gray-600">Bill Type:</span>
          {(['all', 'lr', 'warehouse'] as const).map(t => (
            <button
              key={t}
              onClick={() => setBillTypeFilter(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                billTypeFilter === t
                  ? t === 'lr'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : t === 'warehouse'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {t === 'lr' && <Truck className="w-3 h-3" />}
              {t === 'warehouse' && <Building2 className="w-3 h-3" />}
              {t === 'all' ? 'All Bills' : t === 'lr' ? 'Transportation' : 'Warehouse'}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {searched && bills.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Bills', value: bills.length, color: 'bg-gray-50 border-gray-200', text: 'text-gray-800' },
            { label: 'Pending', value: pendingCount, color: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
            { label: 'Collected', value: collectedCount, color: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700' },
            { label: 'Total Value', value: fmt(totalBillAmount), color: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} border rounded-xl px-5 py-4`}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-xl font-black mt-1 ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results Table */}
      {searched && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Results{' '}
              <span className="text-sm font-normal text-gray-500">
                ({bills.length} bill{bills.length !== 1 ? 's' : ''} found)
              </span>
            </h2>
          </div>

          {bills.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No bills found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['#', 'Bill Number', 'Bill Type', 'Customer', 'Bill Amount', 'Bill Date', 'Due Date', 'Status', 'PR Number', 'Actions'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {bills.map((bill, idx) => {
                    const pr = prMap[bill.bill_id];
                    const isCollected = !!pr;
                    const overdue = isOverdue(bill.bill_due_date) && !isCollected;

                    return (
                      <tr key={bill.bill_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-medium">{idx + 1}</td>

                        {/* Bill Number */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setViewBillData(bill)}
                            className="text-sm font-bold text-teal-700 hover:text-teal-900 hover:underline transition-colors"
                          >
                            {bill.bill_number}
                          </button>
                        </td>

                        {/* Bill Type Badge */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${bill.bill_type === 'lr' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {bill.bill_type === 'lr' ? <Truck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                            {bill.bill_type === 'lr' ? 'Transport' : 'Warehouse'}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium max-w-[200px] truncate" title={bill.billing_party_name}>
                          {bill.billing_party_name}
                        </td>

                        {/* Bill Amount */}
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800 text-right whitespace-nowrap">
                          {fmt(bill.bill_amount)}
                        </td>

                        {/* Bill Date */}
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(bill.bill_date)}</td>

                        {/* Due Date */}
                        <td className={`px-4 py-3 text-sm whitespace-nowrap ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {fmtDate(bill.bill_due_date)}
                          {overdue && <span className="ml-1 text-xs font-bold">OVERDUE</span>}
                        </td>

                        {/* Collection Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isCollected ? 'bg-emerald-100 text-emerald-700' : overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isCollected ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {isCollected ? 'Collected' : overdue ? 'Overdue' : 'Pending'}
                          </span>
                        </td>

                        {/* PR Number */}
                        <td className="px-4 py-3">
                          {pr ? (
                            <button
                              onClick={() => setViewPrData(pr)}
                              className="text-sm font-bold text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                            >
                              {pr.pr_number}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* Payment Receipt — only for pending */}
                            <button
                              onClick={() => !isCollected && setPrModalBill(bill)}
                              disabled={isCollected}
                              title={isCollected ? 'Payment already recorded for this bill' : 'Record payment receipt'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isCollected
                                  ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                  : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                              }`}
                            >
                              <Receipt className="w-4 h-4" />
                            </button>

                            {/* Edit PR — only for collected */}
                            <button
                              onClick={() => isCollected && setEditPrBill(bill)}
                              disabled={!isCollected}
                              title={!isCollected ? 'No payment receipt to edit' : 'Edit payment receipt'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                !isCollected
                                  ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                  : 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                              }`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Cancel PR — only for collected */}
                            <button
                              onClick={() => isCollected && setCancelPrBill(bill)}
                              disabled={!isCollected}
                              title={!isCollected ? 'No payment receipt to cancel' : 'Cancel payment receipt'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                !isCollected
                                  ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
          <CreditCard className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Use the search panel above to find bills</p>
          <p className="text-sm text-gray-400 mt-1">Defaults to the current month's bills</p>
        </div>
      )}

      {/* Modals */}
      {prModalBill && (
        <PaymentReceiptModal
          bill={prModalBill}
          onClose={() => setPrModalBill(null)}
          onSave={handleSavePR}
          saving={saving}
        />
      )}

      {editPrBill && prMap[editPrBill.bill_id] && (
        <EditPRModal
          pr={prMap[editPrBill.bill_id]}
          bill={editPrBill}
          onClose={() => setEditPrBill(null)}
          onSave={handleEditPR}
          saving={saving}
        />
      )}

      {cancelPrBill && prMap[cancelPrBill.bill_id] && (
        <ConfirmCancelPRModal
          pr={prMap[cancelPrBill.bill_id]}
          bill={cancelPrBill}
          onClose={() => setCancelPrBill(null)}
          onConfirm={handleCancelPR}
          saving={saving}
        />
      )}

      {viewPrData && (
        <PaymentReceiptViewModal
          pr={viewPrData}
          onClose={() => setViewPrData(null)}
        />
      )}

      {viewBillData && (
        <BillViewModal
          bill={viewBillData}
          pr={prMap[viewBillData.bill_id]}
          onClose={() => setViewBillData(null)}
        />
      )}
    </div>
  );
}
